import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { dbHelper } from '../config/database.js';
import { detectAcademicDiscrepancies, recordDiscrepancies } from '../services/mismatchDetector.js';
import { logAudit } from '../services/auditService.js';
import { normalizeDob } from './authController.js';

/**
 * Extracts Date of Birth from row object with case-insensitive and alias matching:
 * Handles headers like:
 * - "Date of Birth (DOB)", "DOB (Date of Birth)", "Date of Birth"
 * - "dob", "DOB", "d.o.b", "d.o.b."
 * - "birth_date", "birthdate", "Date Of Birth"
 * - "DOB (DD/MM/YYYY)", "DOB (YYYY-MM-DD)"
 */
export function extractDobFromRow(r) {
  if (!r || typeof r !== 'object') return '';

  const direct = r.dob || r.DOB || r['Date of Birth'] || r['date_of_birth'] || 
                 r['Date of Birth (DOB)'] || r['DOB (Date of Birth)'] || 
                 r['Date Of Birth'] || r['Birth Date'] || r['birth_date'] || 
                 r['DOB (DD/MM/YYYY)'] || r['DOB (YYYY-MM-DD)'] || 
                 r['DOB(DD/MM/YYYY)'] || r['DOB(YYYY-MM-DD)'] ||
                 r['DOB (DD-MM-YYYY)'] || r['DOB(DD-MM-YYYY)'];
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
    return direct;
  }

  const keys = Object.keys(r);
  for (const k of keys) {
    const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      clean === 'dob' || 
      clean === 'dateofbirth' || 
      clean === 'dateofbirthdob' || 
      clean === 'dobdateofbirth' || 
      clean === 'birthdate' ||
      clean === 'studentdob' ||
      clean === 'dobddmmyyyy' ||
      clean === 'dobyyyymmdd' ||
      clean.startsWith('dob') ||
      clean.includes('dateofbirth') ||
      clean.includes('birthdate')
    ) {
      if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
        return r[k];
      }
    }
  }

  return '';
}

/**
 * Robustly parses and normalizes Date of Birth from various spreadsheet representations:
 * - Excel date serial numbers (e.g. 37987)
 * - Date objects
 * - Formatted strings (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
 */
export function parseDateOfBirth(val) {
  if (!val && val !== 0) return '';
  return normalizeDob(val);
}

/**
 * Safely parses a 4-digit passing year from a value (number, string, date).
 */
export function parsePassingYear(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date && !isNaN(val)) {
    return val.getFullYear();
  }
  const str = String(val).trim();
  const match = str.match(/\b(19\d\d|20\d\d)\b/);
  if (match) {
    const yr = parseInt(match[1], 10);
    if (yr >= 1990 && yr <= 2040) return yr;
  }
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    if (num >= 1990 && num <= 2040) return num;
    if (num >= 0 && num <= 50) return 2000 + num;
    if (num > 50 && num <= 99) return 1900 + num;
  }
  return null;
}

/**
 * Extracts 10th or 12th passing year from a spreadsheet row object.
 * Checks known aliases, direct properties, and case-insensitive/cleaned keys.
 */
export function extractYearFromRow(r, type, fallback = null) {
  if (!r || typeof r !== 'object') return fallback;

  if (type === '10th') {
    const directCandidates = [
      r.tenth_year, r['10th_year'], r['10th Year'], r['10th year'],
      r.tenth_passing_year, r['10th_passing_year'], r['10th Passing Year'], r['10th passing year'],
      r.sslc_year, r['sslc_year'], r['SSLC Year'], r['SSLC year'],
      r.sslc_passing_year, r['sslc_passing_year'], r['SSLC Passing Year'], r['SSLC passing year'],
      r['10th Year of Passing'], r['SSLC Year of Passing'], r['Year of Passing 10th'],
      r['10th YOP'], r['SSLC YOP'], r.tenth_yop, r.sslc_yop
    ];
    for (const cand of directCandidates) {
      const parsed = parsePassingYear(cand);
      if (parsed) return parsed;
    }

    for (const [k, v] of Object.entries(r)) {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes('percent') || clean.includes('marks') || clean.includes('cgpa') || clean.includes('grade')) {
        continue;
      }
      if (
        clean === '10thyear' || clean === 'tenthyear' ||
        clean === '10thpassingyear' || clean === 'tenthpassingyear' ||
        clean === '10thpassyear' || clean === 'tenthpassyear' ||
        clean === '10thyearofpassing' || clean === 'tenthyearofpassing' ||
        clean === 'yearofpassing10th' || clean === 'yearofpassingtenth' ||
        clean === 'sslcyear' || clean === 'sslcpassingyear' || clean === 'sslcyearofpassing' ||
        clean === '10thyop' || clean === 'sslcyop' ||
        (clean.includes('10th') && clean.includes('year')) ||
        (clean.includes('tenth') && clean.includes('year')) ||
        (clean.includes('sslc') && clean.includes('year'))
      ) {
        const parsed = parsePassingYear(v);
        if (parsed) return parsed;
      }
    }
  } else if (type === '12th') {
    const directCandidates = [
      r.twelfth_year, r['12th_year'], r['12th Year'], r['12th year'],
      r.twelfth_passing_year, r['12th_passing_year'], r['12th Passing Year'], r['12th passing year'],
      r.puc_year, r['puc_year'], r['PUC Year'], r['PUC year'],
      r.puc_passing_year, r['puc_passing_year'], r['PUC Passing Year'], r['PUC passing year'],
      r.diploma_year, r['diploma_year'], r['Diploma Year'], r['Diploma year'],
      r.hsc_year, r['hsc_year'], r['HSC Year'], r['HSC year'],
      r['12th Year of Passing'], r['PUC Year of Passing'], r['Year of Passing 12th'],
      r['12th YOP'], r['PUC YOP'], r.twelfth_yop, r.puc_yop
    ];
    for (const cand of directCandidates) {
      const parsed = parsePassingYear(cand);
      if (parsed) return parsed;
    }

    for (const [k, v] of Object.entries(r)) {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes('percent') || clean.includes('marks') || clean.includes('cgpa') || clean.includes('grade')) {
        continue;
      }
      if (
        clean === '12thyear' || clean === 'twelfthyear' ||
        clean === '12thpassingyear' || clean === 'twelfthpassingyear' ||
        clean === '12thpassyear' || clean === 'twelfthpassyear' ||
        clean === '12thyearofpassing' || clean === 'twelfthyearofpassing' ||
        clean === 'yearofpassing12th' || clean === 'yearofpassingtwelfth' ||
        clean === 'pucyear' || clean === 'pucpassingyear' || clean === 'pucyearofpassing' ||
        clean === 'diplomayear' || clean === 'diplomapassingyear' ||
        clean === 'hscyear' || clean === 'hscpassingyear' ||
        clean === '12thyop' || clean === 'pucyop' ||
        (clean.includes('12th') && clean.includes('year')) ||
        (clean.includes('twelfth') && clean.includes('year')) ||
        (clean.includes('puc') && clean.includes('year')) ||
        (clean.includes('diploma') && clean.includes('year'))
      ) {
        const parsed = parsePassingYear(v);
        if (parsed) return parsed;
      }
    }
  }

  return fallback;
}

/**
 * GOOGLE FORMS INTEGRATION / RECONCILIATION
 * Takes Google Form responses (either as array of JSON objects or parsed CSV rows).
 * Cross-references submitted fields against institutional verified master records.
 * NEVER overwrites verified academic data with student-submitted data!
 * If student has default placeholder DOB ('2003-01-01'), updates student's registered DOB.
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
    const rawUsn = row.usn || row.USN || row['USN'] || row['Candidate USN'] || row['Student USN'];
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

      // Save unregistered submission into external_form_submissions
      try {
        await dbHelper.run(`
          INSERT INTO external_form_submissions (
            id, usn, student_name, submitted_cgpa, submitted_backlogs, submitted_branch,
            submitted_email, submitted_mobile, raw_payload, reconciliation_status,
            discrepancies_count, processed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unregistered_student', 0, CURRENT_TIMESTAMP)
        `, [
          crypto.randomUUID(),
          usn,
          row.name || row['Candidate Name'] || row['Student Name'] || 'Unknown',
          row.cgpa ? Number(row.cgpa) : null,
          row.active_backlogs !== undefined ? Number(row.active_backlogs) : null,
          row.branch || null,
          row.email || row['Primary Email'] || null,
          row.mobile || null,
          JSON.stringify(row)
        ]);
      } catch (e) {
        // Ignored
      }

      continue;
    }

    results.matchedCount++;

    const studentRecord = await dbHelper.get('SELECT * FROM students WHERE usn = ?', [usn]);
    const submittedRawDob = extractDobFromRow(row);
    const submittedDob = parseDateOfBirth(submittedRawDob);

    // If student currently has default placeholder DOB ('2003-01-01') and provides a valid submitted DOB,
    // update student's registered DOB so they can sign in with their genuine DOB!
    if (submittedDob && studentRecord && (!studentRecord.dob || studentRecord.dob === '2003-01-01')) {
      await dbHelper.run('UPDATE students SET dob = ? WHERE usn = ?', [submittedDob, usn]);
      studentRecord.dob = submittedDob;
    }

    // Map Google Form field keys
    const submissionData = {
      cgpa: row.cgpa ?? row['CGPA'] ?? row['Bachelor Percentage'] ?? row['Bachelor CGPA'] ?? row['Final Percentage'],
      active_backlogs: row.active_backlogs ?? row['Active Backlogs'] ?? row['activeBacklogs'],
      backlog_history_count: row.backlog_history_count ?? row['History Of Backlogs'] ?? row['History of Backlogs'] ?? row['backlogHistoryCount'],
      tenth_percentage: row.tenth_percentage ?? row['10th Percentage'] ?? row['tenthPercentage'],
      twelfth_percentage: row.twelfth_percentage ?? row['12th Percentage'] ?? row['twelfthPercentage'],
      branch: row.branch ?? row['Branch'] ?? row['Bachelor Branch'] ?? row['Final Branch'],
      graduation_year: row.graduation_year ?? row['Graduation Year'] ?? row['Bachelor Year'] ?? row['Final Year'],
      education_gap_months: row.education_gap_months ?? row['Education Gap Months'] ?? row['Education Gap'],
      dob: submittedDob
    };

    // Run Mismatch Engine
    const analysis = detectAcademicDiscrepancies(submissionData, verifiedRecord, 'google_form');

    // Also verify DOB discrepancy if student already had a verified non-default DOB
    if (submittedDob && studentRecord && studentRecord.dob && studentRecord.dob !== '2003-01-01') {
      if (normalizeDob(studentRecord.dob) !== normalizeDob(submittedDob)) {
        analysis.hasDiscrepancy = true;
        analysis.discrepancies.push({
          fieldName: 'Date of Birth (DOB)',
          submittedValue: submittedDob,
          verifiedValue: studentRecord.dob,
          severity: 'HIGH',
          notes: `Mismatched Date of Birth with institutional record`
        });
      }
    }

    if (analysis.hasDiscrepancy) {
      results.mismatchesDetected++;
      const recorded = await recordDiscrepancies(analysis, 'google_form', actor);
      results.discrepancyDetails.push(...recorded);

      results.processedRows.push({
        usn,
        name: studentRecord?.name || 'Student',
        status: 'FLAGGED_MISMATCH',
        discrepancies: analysis.discrepancies
      });
    } else {
      results.processedRows.push({
        usn,
        name: studentRecord?.name || 'Student',
        status: 'VERIFIED_CLEAN',
        message: 'Submitted data aligns with institutional verified records.'
      });
    }

    // Save into external_form_submissions table
    try {
      const submissionId = crypto.randomUUID();
      const studentName = studentRecord?.name || row.name || row['Candidate Name'] || row['Student Name'] || 'Student';
      const submittedEmail = row.email || row['Primary Email'] || studentRecord?.email || null;
      const submittedMobile = row.mobile || studentRecord?.mobile || null;
      const reconStatus = analysis.hasDiscrepancy ? 'mismatch_flagged' : 'matched';

      await dbHelper.run(`
        INSERT INTO external_form_submissions (
          id, usn, student_name, submitted_cgpa, submitted_backlogs, submitted_branch,
          submitted_email, submitted_mobile, raw_payload, reconciliation_status,
          discrepancies_count, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        submissionId,
        usn,
        studentName,
        submissionData.cgpa ? Number(submissionData.cgpa) : null,
        submissionData.active_backlogs !== undefined && submissionData.active_backlogs !== null ? Number(submissionData.active_backlogs) : null,
        submissionData.branch || null,
        submittedEmail,
        submittedMobile,
        JSON.stringify(row),
        reconStatus,
        analysis.discrepancies.length
      ]);
    } catch (saveErr) {
      console.warn('Failed to insert into external_form_submissions:', saveErr.message);
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
    const rawUsn = r.usn || r.USN || r['Candidate USN'] || r['Student USN'];
    const name = r.name || r.Name || r['Student Name'] || r['Candidate Name'] || 'Student';
    const email = r.email || r.Email || r['Primary Email'] || `${rawUsn?.toLowerCase()}@placement.edu`;

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

      const rawDob = extractDobFromRow(r);
      const parsedDob = parseDateOfBirth(rawDob);
      const dobVal = parsedDob || '2003-01-01';

      if (!student) {
        // Create user & student
        const userId = crypto.randomUUID();
        const studentId = crypto.randomUUID();

        await dbHelper.run(`
          INSERT INTO users (id, username, email, password_hash, role, status)
          VALUES (?, ?, ?, ?, 'student', 'active')
        `, [userId, usn.toLowerCase(), email, defaultPasswordHash]);

        await dbHelper.run(`
          INSERT INTO students (id, user_id, usn, name, email, mobile, gender, dob)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [studentId, userId, usn, name, email, r.mobile || null, r.gender || null, dobVal]);

        const gradYr = Number(r.graduation_year || r['Graduation Year'] || 2027);
        const tenthYr = extractYearFromRow(r, '10th', gradYr ? gradYr - 6 : 2019);
        const twelfthYr = extractYearFromRow(r, '12th', gradYr ? gradYr - 4 : 2021);

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
          tenthYr,
          Number(r.twelfth_percentage || r['12th Percentage'] || 60),
          twelfthYr,
          r.degree || r['Degree'] || 'B.Tech',
          branchVal,
          Number(r.cgpa || r['CGPA'] || 7.0),
          gradYr,
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
        if (parsedDob) {
          await dbHelper.run(`
            UPDATE students 
            SET dob = ?, name = COALESCE(?, name), email = COALESCE(?, email) 
            WHERE usn = ?
          `, [parsedDob, name || null, email || null, usn]);
        }

        const tenthYr = extractYearFromRow(r, '10th', null);
        const twelfthYr = extractYearFromRow(r, '12th', null);

        // Update existing verified academic record
        await dbHelper.run(`
          UPDATE academic_records
          SET tenth_percentage = COALESCE(?, tenth_percentage),
              tenth_year = COALESCE(?, tenth_year),
              twelfth_percentage = COALESCE(?, twelfth_percentage),
              twelfth_year = COALESCE(?, twelfth_year),
              branch = COALESCE(?, branch),
              cgpa = COALESCE(?, cgpa),
              active_backlogs = COALESCE(?, active_backlogs),
              graduation_year = COALESCE(?, graduation_year),
              updated_at = CURRENT_TIMESTAMP
          WHERE usn = ?
        `, [
          r.tenth_percentage ? Number(r.tenth_percentage) : null,
          tenthYr,
          r.twelfth_percentage ? Number(r.twelfth_percentage) : null,
          twelfthYr,
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
