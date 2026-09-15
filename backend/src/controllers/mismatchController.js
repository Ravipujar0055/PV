import { dbHelper } from '../config/database.js';
import { logAudit } from '../services/auditService.js';

export async function getAllMismatches(req, res) {
  const { status, severity, search } = req.query;

  let query = `
    SELECT m.*, s.name as student_name, s.email as student_email,
           u.status as user_status, ar.verification_status, ar.branch
    FROM data_mismatches m
    LEFT JOIN students s ON s.usn = m.usn
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN academic_records ar ON ar.usn = m.usn
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }
  if (severity) {
    query += ' AND m.severity = ?';
    params.push(severity);
  }
  if (search) {
    query += ' AND (m.usn LIKE ? OR s.name LIKE ? OR m.field_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY m.created_at DESC';

  const mismatches = await dbHelper.all(query, params);
  return res.json({ mismatches });
}

export async function updateStudentBlockStatus(req, res) {
  const { usn } = req.params;
  const { status, reason } = req.body; // status: 'active' or 'blocked'

  if (!['active', 'blocked'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or blocked.' });
  }

  const student = await dbHelper.get('SELECT s.*, u.id as user_id, u.status as old_status FROM students s JOIN users u ON u.id = s.user_id WHERE s.usn = ?', [usn]);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  await dbHelper.run('UPDATE users SET status = ? WHERE id = ?', [status, student.user_id]);

  if (status === 'blocked') {
    await dbHelper.run(`
      UPDATE academic_records 
      SET verification_status = 'FLAGGED', updated_at = CURRENT_TIMESTAMP 
      WHERE usn = ?
    `, [usn]);
  }

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: status === 'blocked' ? 'STUDENT_BLOCKED' : 'STUDENT_UNBLOCKED',
    entityType: 'STUDENT',
    entityId: usn,
    oldValues: { status: student.old_status },
    newValues: { status, reason: reason || 'Placement policy enforcement' },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: `Student ${usn} has been ${status === 'blocked' ? 'BLOCKED from' : 'UNBLOCKED for'} placement registrations.`,
    usn,
    status
  });
}

export async function resolveMismatch(req, res) {
  const { id } = req.params;
  const { resolutionStatus, resolutionNotes } = req.body; // 'resolved', 'penalized', 'flagged'

  const mismatch = await dbHelper.get('SELECT * FROM data_mismatches WHERE id = ?', [id]);
  if (!mismatch) {
    return res.status(404).json({ error: 'Discrepancy record not found.' });
  }

  await dbHelper.run(`
    UPDATE data_mismatches 
    SET status = ?, notes = COALESCE(?, notes) 
    WHERE id = ?
  `, [resolutionStatus || 'resolved', resolutionNotes, id]);

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'MISMATCH_RESOLVED',
    entityType: 'DATA_MISMATCH',
    entityId: id,
    oldValues: { status: mismatch.status },
    newValues: { status: resolutionStatus, notes: resolutionNotes },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({ message: 'Mismatch record updated successfully.' });
}

export async function updateAcademicVerificationStatus(req, res) {
  const { usn } = req.params;
  const { verificationStatus, verifiedBy } = req.body; // 'VERIFIED', 'PENDING', 'FLAGGED'

  if (!['VERIFIED', 'PENDING', 'FLAGGED'].includes(verificationStatus)) {
    return res.status(400).json({ error: 'Status must be VERIFIED, PENDING, or FLAGGED.' });
  }

  const existing = await dbHelper.get('SELECT * FROM academic_records WHERE usn = ?', [usn]);
  if (!existing) {
    return res.status(404).json({ error: 'Academic record not found.' });
  }

  await dbHelper.run(`
    UPDATE academic_records 
    SET verification_status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE usn = ?
  `, [verificationStatus, verifiedBy || req.user.name || 'Placement Cell Admin', usn]);

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'ACADEMIC_RECORD_VERIFICATION_STATUS_CHANGED',
    entityType: 'ACADEMIC_RECORD',
    entityId: usn,
    oldValues: { status: existing.verification_status },
    newValues: { status: verificationStatus, verifiedBy: verifiedBy || req.user.name },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: `Academic verification status for ${usn} updated to ${verificationStatus}.`,
    usn,
    verificationStatus
  });
}
