import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { dbHelper } from '../config/database.js';
import { detectAcademicDiscrepancies, recordDiscrepancies } from '../services/mismatchDetector.js';
import { logAudit } from '../services/auditService.js';
import { normalizeDob } from './authController.js';

/**
 * Robustly parses and normalizes Date of Birth from various spreadsheet representations:
 * - Excel date serial numbers (e.g. 37987)
 * - Date objects
 * - Formatted strings (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
 */
export function parseDateOfBirth(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return normalizeDob(val);
}

/**
 * GOOGLE FORMS INTEGRATION / RECONCILIATION
 * Takes Google Form responses (either as array of JSON objects or parsed CSV rows).
 * Cross-references submitted fields against institutional verified master records.
 * NEVER overwrites verified academic data with student-submitted data!
 */
export async function importGoogleFormData(req, res) {
  const { responses } = req.body; // Array of submission objects

  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of Google Form responses to reconcile.' });
  }

  const results = {
    totalReceived: responses.length,
    matchedCount: 0,
    notFoundCount: 0,
    mismatchesDetected: 0,
    discrepancyDetails: [],
    processedRows: []
  };

  const actor = {
    id: req.user.id,
    name: req.user.name || req.user.username,
    role: req.user.role
  };

  for (const row of responses) {
    const rawUsn = row.usn || row.USN || row['USN'] || row['Candidate USN'];
    if (!rawUsn) {
      results.notFoundCount++;
      continue;
    }

    const usn = rawUsn.trim().toUpperCase();

    // Look up in institutional master database
    const verifiedRecord = await dbHelper.get('SELECT * FROM academic_records WHERE usn = ?', [usn]);

    if (!verifiedRecord) {
      results.notFoundCount++;
      results.processedRows.push({
        usn,
        status: 'UNKNOWN_STUDENT',
        message: 'No institutional academic record found for this USN'
      });
      continue;
    }

    results.matchedCount++;

    // Map Google Form field keys
    const submissionData = {
      cgpa: row.cgpa ?? row['CGPA'] ?? row['Bachelor Percentage'] ?? row['Bachelor CGPA'] ?? row['Final Percentage'],
      active_backlogs: row.active_backlogs ?? row['Active Backlogs'] ?? row['activeBacklogs'],
      backlog_history_count: row.backlog_history_count ?? row['History Of Backlogs'] ?? row['History of Backlogs'] ?? row['backlogHistoryCount'],
      tenth_percentage: row.tenth_percentage ?? row['10th Percentage'] ?? row['tenthPercentage'],
      twelfth_percentage: row.twelfth_percentage ?? row['12th Percentage'] ?? row['twelfthPercentage'],
      branch: row.branch ?? row['Branch'] ?? row['Bachelor Branch'] ?? row['Final Branch'],
      graduation_year: row.graduation_year ?? row['Graduation Year'] ?? row['Bachelor Year'] ?? row['Final Year'],
      education_gap_months: row.education_gap_months ?? row['Education Gap Months'] ?? row['Education Gap']
    };

    // Run Mismatch Engine
    const analysis = detectAcademicDiscrepancies(submissionData, verifiedRecord, 'google_form');

    if (analysis.hasDiscrepancy) {
      results.mismatchesDetected++;
      const recorded = await recordDiscrepancies(analysis, 'google_form', actor);
      results.discrepancyDetails.push(...recorded);

      results.processedRows.push({
        usn,
        name: verifiedRecord.name,
        status: 'FLAGGED_MISMATCH',
        discrepancies: analysis.discrepancies
      });
    } else {
      results.processedRows.push({
        usn,
        status: 'VERIFIED_CLEAN',
        message: 'Submitted data aligns with institutional verified records.'
      });
    }
  }

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'GOOGLE_FORM_RECONCILIATION_RUN',
    entityType: 'IMPORT_BATCH',
    newValues: {
      total: results.totalReceived,
      mismatches: results.mismatchesDetected,
      matched: results.matchedCount
    },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: `Reconciliation complete: ${results.mismatchesDetected} discrepancy record(s) flagged out of ${results.totalReceived} responses.`,
    results
  });
}

/**
 * MASTER ACADEMIC DATABASE IMPORT (CSV / JSON)
 * Admin imports or updates institutional verified records.
 */
export async function importMasterAcademicRecords(req, res) {
  const { records, updateExisting = false } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Please provide valid academic master records.' });
  }

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const defaultPasswordHash = bcrypt.hashSync('Student@123', 10);

  for (const r of records) {
    const rawUsn = r.usn || r.USN;
    const name = r.name || r.Name || 'Student';
    const email = r.email || r.Email || `${rawUsn?.toLowerCase()}@placement.edu`;

    if (!rawUsn) {
      skippedCount++;
      continue;
    }

    const usn = rawUsn.trim().toUpperCase();
    let branchVal = (r.branch || r['Branch'] || 'CSE').toUpperCase().trim();
    if (branchVal === 'ISE/IT' || branchVal === 'ISE/ IT' || branchVal === 'ISE / IT' || branchVal === 'IT') {
      branchVal = 'ISE';
    }

    try {
      // Check if student user exists
      let student = await dbHelper.get('SELECT id, user_id FROM students WHERE usn = ?', [usn]);

      if (!student) {
        // Create user & student
        const userId = crypto.randomUUID();
        const studentId = crypto.randomUUID();

        await dbHelper.run(`
          INSERT INTO users (id, username, email, password_hash, role, status)
          VALUES (?, ?, ?, ?, 'student', 'active')
        `, [userId, usn.toLowerCase(), email, defaultPasswordHash]);

        const rawDob = r.dob || r.DOB || r['Date of Birth'] || r['date_of_birth'] || r['Date Of Birth'] || r['Birth Date'] || r['DOB (DD/MM/YYYY)'] || r['DOB (YYYY-MM-DD)'];
        const parsedDob = parseDateOfBirth(rawDob);
        const dobVal = parsedDob || '2003-01-01';

        await dbHelper.run(`
          INSERT INTO students (id, user_id, usn, name, email, mobile, gender, dob)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [studentId, userId, usn, name, email, r.mobile || null, r.gender || null, dobVal]);

        // Insert initial verified academic record
        await dbHelper.run(`
          INSERT INTO academic_records (
            id, student_id, usn, tenth_percentage, tenth_year, twelfth_percentage, twelfth_year,
            degree, branch, cgpa, graduation_year, active_backlogs, backlog_history_count,
            education_gap, education_gap_months, work_experience_months, verification_status,
            verified_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
        `, [
          crypto.randomUUID(), studentId, usn,
          Number(r.tenth_percentage || r['10th Percentage'] || 60),
          Number(r.tenth_year || r['10th Year'] || 2019),
          Number(r.twelfth_percentage || r['12th Percentage'] || 60),
          Number(r.twelfth_year || r['12th Year'] || 2021),
          r.degree || r['Degree'] || 'B.Tech',
          branchVal,
          Number(r.cgpa || r['CGPA'] || 7.0),
          Number(r.graduation_year || r['Graduation Year'] || 2027),
          Number(r.active_backlogs ?? r['Active Backlogs'] ?? 0),
          Number(r.backlog_history_count ?? r['History Of Backlogs'] ?? 0),
          r.education_gap ? 1 : 0,
          Number(r.education_gap_months || 0),
          Number(r.work_experience_months || 0),
          req.user.name || 'Placement Cell Import'
        ]);

        importedCount++;
      } else if (updateExisting) {
        // Update student personal information (DOB, Name, Email) if provided in spreadsheet
        const rawDob = r.dob || r.DOB || r['Date of Birth'] || r['date_of_birth'] || r['Date Of Birth'] || r['Birth Date'] || r['DOB (DD/MM/YYYY)'] || r['DOB (YYYY-MM-DD)'];
        const parsedDob = parseDateOfBirth(rawDob);
        if (parsedDob) {
          await dbHelper.run(`
            UPDATE students 
            SET dob = ?, name = COALESCE(?, name), email = COALESCE(?, email) 
            WHERE usn = ?
          `, [parsedDob, name || null, email || null, usn]);
        }

        // Update existing verified academic record
        await dbHelper.run(`
          UPDATE academic_records
          SET tenth_percentage = COALESCE(?, tenth_percentage),
              twelfth_percentage = COALESCE(?, twelfth_percentage),
              branch = COALESCE(?, branch),
              cgpa = COALESCE(?, cgpa),
              active_backlogs = COALESCE(?, active_backlogs),
              graduation_year = COALESCE(?, graduation_year),
              updated_at = CURRENT_TIMESTAMP
          WHERE usn = ?
        `, [
          r.tenth_percentage ? Number(r.tenth_percentage) : null,
          r.twelfth_percentage ? Number(r.twelfth_percentage) : null,
          branchVal || null,
          r.cgpa ? Number(r.cgpa) : null,
          r.active_backlogs !== undefined ? Number(r.active_backlogs) : null,
          r.graduation_year ? Number(r.graduation_year) : null,
          usn
        ]);
        updatedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      errors.push({ usn, error: err.message });
    }
  }

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'MASTER_ACADEMIC_RECORDS_IMPORTED',
    entityType: 'ACADEMIC_RECORDS',
    newValues: { importedCount, updatedCount, skippedCount },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: `Master academic import finished: ${importedCount} imported, ${updatedCount} updated, ${skippedCount} skipped.`,
    importedCount,
    updatedCount,
    skippedCount,
    errors
  });
}
