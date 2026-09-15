import { dbHelper } from '../config/database.js';
import { logAudit } from './auditService.js';
import crypto from 'node:crypto';

/**
 * Detects discrepancies between student-submitted information (e.g. from Google Forms or CSV import)
 * and the verified institutional academic master database.
 */
export function detectAcademicDiscrepancies(submittedData, verifiedRecord, source = 'google_form') {
  if (!verifiedRecord) {
    return { hasDiscrepancy: false, discrepancies: [], status: 'STUDENT_NOT_FOUND' };
  }

  const discrepancies = [];

  // Helper to normalize strings for comparison
  const normalize = val => (val === undefined || val === null ? '' : String(val).trim().toUpperCase());
  const parseNum = val => (val === undefined || val === null || val === '' ? null : Number(val));

  // 1. CGPA Discrepancy (HIGH SEVERITY)
  const submittedCgpa = parseNum(submittedData.cgpa || submittedData.bachelor_cgpa || submittedData.final_cgpa || submittedData['CGPA']);
  if (submittedCgpa !== null && !isNaN(submittedCgpa)) {
    const verifiedCgpa = Number(verifiedRecord.cgpa);
    if (Math.abs(submittedCgpa - verifiedCgpa) > 0.05) {
      discrepancies.push({
        fieldName: 'CGPA',
        submittedValue: submittedCgpa.toFixed(2),
        verifiedValue: verifiedCgpa.toFixed(2),
        severity: 'HIGH',
        notes: submittedCgpa > verifiedCgpa
          ? `Inflated CGPA by +${(submittedCgpa - verifiedCgpa).toFixed(2)}`
          : `CGPA reported as ${submittedCgpa.toFixed(2)}, verified is ${verifiedCgpa.toFixed(2)}`
      });
    }
  }

  // 2. Active Backlogs Discrepancy (HIGH SEVERITY)
  const submittedBacklogs = parseNum(submittedData.active_backlogs ?? submittedData['Active Backlogs'] ?? submittedData['activeBacklogs']);
  if (submittedBacklogs !== null && !isNaN(submittedBacklogs)) {
    const verifiedBacklogs = Number(verifiedRecord.active_backlogs || 0);
    if (submittedBacklogs !== verifiedBacklogs) {
      discrepancies.push({
        fieldName: 'Active Backlogs',
        submittedValue: String(submittedBacklogs),
        verifiedValue: String(verifiedBacklogs),
        severity: 'HIGH',
        notes: submittedBacklogs < verifiedBacklogs
          ? `Concealed active backlogs (Reported ${submittedBacklogs}, Actual ${verifiedBacklogs})`
          : `Reported backlogs ${submittedBacklogs}, verified is ${verifiedBacklogs}`
      });
    }
  }

  // 3. Backlog History Discrepancy (MEDIUM SEVERITY)
  const submittedHistory = parseNum(submittedData.backlog_history_count ?? submittedData['History Of Backlogs'] ?? submittedData['backlogHistoryCount']);
  if (submittedHistory !== null && !isNaN(submittedHistory)) {
    const verifiedHistory = Number(verifiedRecord.backlog_history_count || 0);
    if (submittedHistory !== verifiedHistory) {
      discrepancies.push({
        fieldName: 'Backlog History Count',
        submittedValue: String(submittedHistory),
        verifiedValue: String(verifiedHistory),
        severity: 'MEDIUM',
        notes: `Reported history ${submittedHistory}, verified ${verifiedHistory}`
      });
    }
  }

  // 4. 10th Percentage Discrepancy (MEDIUM SEVERITY)
  const submitted10th = parseNum(submittedData.tenth_percentage ?? submittedData['10th Percentage'] ?? submittedData['tenthPercentage']);
  if (submitted10th !== null && !isNaN(submitted10th)) {
    const verified10th = Number(verifiedRecord.tenth_percentage);
    if (Math.abs(submitted10th - verified10th) > 0.5) {
      discrepancies.push({
        fieldName: '10th Percentage',
        submittedValue: `${submitted10th.toFixed(1)}%`,
        verifiedValue: `${verified10th.toFixed(1)}%`,
        severity: 'MEDIUM',
        notes: `Difference of ${(submitted10th - verified10th).toFixed(1)}%`
      });
    }
  }

  // 5. 12th Percentage Discrepancy (MEDIUM SEVERITY)
  const submitted12th = parseNum(submittedData.twelfth_percentage ?? submittedData['12th Percentage'] ?? submittedData['twelfthPercentage']);
  if (submitted12th !== null && !isNaN(submitted12th)) {
    const verified12th = Number(verifiedRecord.twelfth_percentage);
    if (Math.abs(submitted12th - verified12th) > 0.5) {
      discrepancies.push({
        fieldName: '12th Percentage',
        submittedValue: `${submitted12th.toFixed(1)}%`,
        verifiedValue: `${verified12th.toFixed(1)}%`,
        severity: 'MEDIUM',
        notes: `Difference of ${(submitted12th - verified12th).toFixed(1)}%`
      });
    }
  }

  // 6. Branch Discrepancy (HIGH SEVERITY)
  const submittedBranch = normalize(submittedData.branch || submittedData.bachelor_branch || submittedData.final_branch || submittedData['Branch'] || submittedData['Bachelor Branch']);
  if (submittedBranch) {
    const verifiedBranch = normalize(verifiedRecord.branch);
    if (submittedBranch !== verifiedBranch) {
      discrepancies.push({
        fieldName: 'Branch',
        submittedValue: submittedBranch,
        verifiedValue: verifiedBranch,
        severity: 'HIGH',
        notes: `Mismatched academic branch`
      });
    }
  }

  // 7. Graduation Year Discrepancy
  const submittedGradYear = parseNum(submittedData.graduation_year ?? submittedData.bachelor_year ?? submittedData.final_year ?? submittedData['Graduation Year']);
  if (submittedGradYear !== null && !isNaN(submittedGradYear)) {
    const verifiedGradYear = Number(verifiedRecord.graduation_year);
    if (submittedGradYear !== verifiedGradYear) {
      discrepancies.push({
        fieldName: 'Graduation Year',
        submittedValue: String(submittedGradYear),
        verifiedValue: String(verifiedGradYear),
        severity: 'MEDIUM',
        notes: `Reported batch ${submittedGradYear}, institutional batch ${verifiedGradYear}`
      });
    }
  }

  return {
    hasDiscrepancy: discrepancies.length > 0,
    discrepancies,
    usn: verifiedRecord.usn,
    studentId: verifiedRecord.student_id
  };
}

/**
 * Persists detected mismatches, updates student verification status to FLAGGED,
 * creates audit records, and sends admin notifications.
 */
export async function recordDiscrepancies(result, source = 'google_form', actor = { id: 'system', name: 'Verification Engine', role: 'system' }) {
  if (!result || !result.hasDiscrepancy) return [];

  const createdRecords = [];

  for (const item of result.discrepancies) {
    const id = crypto.randomUUID();
    await dbHelper.run(`
      INSERT INTO data_mismatches (id, usn, student_id, source, field_name, submitted_value, verified_value, severity, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'flagged', ?)
    `, [
      id,
      result.usn,
      result.studentId,
      source,
      item.fieldName,
      item.submittedValue,
      item.verifiedValue,
      item.severity,
      item.notes
    ]);

    createdRecords.push({ id, ...item, usn: result.usn });

    // Log to Immutable Audit Trail
    await logAudit({
      userId: actor.id,
      userName: actor.name,
      role: actor.role,
      action: 'DATA_MISMATCH_DETECTED',
      entityType: 'ACADEMIC_RECORD',
      entityId: result.usn,
      oldValues: { verifiedValue: item.verifiedValue },
      newValues: { submittedValue: item.submittedValue, field: item.fieldName, source },
      notes: item.notes
    });
  }

  // Update academic_records status to FLAGGED
  await dbHelper.run(`
    UPDATE academic_records 
    SET verification_status = 'FLAGGED', updated_at = CURRENT_TIMESTAMP 
    WHERE usn = ?
  `, [result.usn]);

  // Insert Admin Notification
  const notifId = crypto.randomUUID();
  await dbHelper.run(`
    INSERT INTO notifications (id, user_id, title, message, type)
    VALUES (?, NULL, ?, ?, 'danger')
  `, [
    notifId,
    `Academic Data Mismatch Alert: ${result.usn}`,
    `${result.discrepancies.length} discrepancy/discrepancies detected for student ${result.usn} via ${source}. Record marked FLAGGED.`
  ]);

  return createdRecords;
}
