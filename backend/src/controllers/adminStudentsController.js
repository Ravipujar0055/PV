import { dbHelper } from '../config/database.js';
import { logAudit } from '../services/auditService.js';
import { normalizeDob } from './authController.js';

export async function getAllStudentsAdmin(req, res) {
  const { search, branch, status, verification } = req.query;

  let query = `
    SELECT s.id, s.usn, s.name, s.email, s.dob, s.mobile, s.gender,
           u.status as user_status,
           ar.cgpa, ar.tenth_percentage, ar.tenth_year, ar.twelfth_percentage, ar.twelfth_year, ar.branch, ar.degree,
           ar.graduation_year, ar.active_backlogs, ar.backlog_history_count,
           ar.verification_status, ar.verified_by, ar.verified_at,
           (SELECT COUNT(*) FROM applications WHERE student_id = s.id) as application_count,
           (SELECT COUNT(*) FROM data_mismatches WHERE usn = s.usn) as mismatch_count
    FROM students s
    JOIN users u ON u.id = s.user_id
    JOIN academic_records ar ON ar.student_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND (s.usn LIKE ? OR s.name LIKE ? OR s.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (branch) {
    query += ' AND ar.branch = ?';
    params.push(branch.toUpperCase());
  }
  if (status) {
    query += ' AND u.status = ?';
    params.push(status);
  }
  if (verification) {
    query += ' AND ar.verification_status = ?';
    params.push(verification);
  }

  query += ' ORDER BY s.usn ASC';

  const students = await dbHelper.all(query, params);
  return res.json({ students });
}

export async function getStudentDetailsAdmin(req, res) {
  const { usn } = req.params;

  const student = await dbHelper.get(`
    SELECT s.*, u.status as user_status, u.role, u.created_at as account_created_at
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.usn = ?
  `, [usn]);

  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const academic = await dbHelper.get('SELECT * FROM academic_records WHERE student_id = ?', [student.id]);
  const profile = await dbHelper.get('SELECT * FROM student_profiles WHERE student_id = ?', [student.id]);
  const applications = await dbHelper.all(`
    SELECT a.*, d.title as drive_title, c.name as company_name, d.ctc_lpa
    FROM applications a
    JOIN placement_drives d ON d.id = a.drive_id
    JOIN companies c ON c.id = d.company_id
    WHERE a.student_id = ?
    ORDER BY a.applied_at DESC
  `, [student.id]);

  const mismatches = await dbHelper.all('SELECT * FROM data_mismatches WHERE usn = ? ORDER BY created_at DESC', [usn]);

  return res.json({
    student,
    academic,
    profile: profile ? {
      resumeFilename: profile.resume_filename,
      resumePath: profile.resume_path,
      projects: JSON.parse(profile.projects || '[]'),
      skills: JSON.parse(profile.skills || '[]'),
      certifications: JSON.parse(profile.certifications || '[]')
    } : null,
    applications,
    mismatches
  });
}

export async function editVerifiedRecordAdmin(req, res) {
  const { usn } = req.params;
  const {
    cgpa, tenth_percentage, tenth_year, twelfth_percentage, twelfth_year, branch,
    active_backlogs, backlog_history_count, graduation_year,
    education_gap_months, reason, dob, email, mobile
  } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Administrative audit requires an explicit reason for modifying verified student records.' });
  }

  const existing = await dbHelper.get('SELECT * FROM academic_records WHERE usn = ?', [usn]);
  if (!existing) {
    return res.status(404).json({ error: 'Academic record not found.' });
  }

  const targetStudent = await dbHelper.get('SELECT id, user_id, dob, email, mobile FROM students WHERE usn = ?', [usn]);
  if (!targetStudent) {
    return res.status(404).json({ error: 'Student personal record not found.' });
  }

  let updatedDob = targetStudent.dob;
  if (dob) {
    const normDob = normalizeDob(dob);
    if (normDob) {
      await dbHelper.run('UPDATE students SET dob = ? WHERE usn = ?', [normDob, usn]);
      updatedDob = normDob;
    }
  }

  // Update Email if provided
  let updatedEmail = targetStudent.email;
  if (email && email.trim() !== '') {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address format provided.' });
    }

    // Check if email already taken by someone else
    const conflict = await dbHelper.get(
      'SELECT id FROM users WHERE LOWER(email) = ? AND id != ?',
      [cleanEmail, targetStudent.user_id]
    );
    if (conflict) {
      return res.status(400).json({ error: `Email ${cleanEmail} is already in use by another user account.` });
    }

    await dbHelper.run('UPDATE students SET email = ? WHERE usn = ?', [cleanEmail, usn]);
    await dbHelper.run('UPDATE users SET email = ? WHERE id = ?', [cleanEmail, targetStudent.user_id]);
    updatedEmail = cleanEmail;
  }

  // Update Mobile if provided
  let updatedMobile = targetStudent.mobile;
  if (mobile !== undefined) {
    const cleanMobile = mobile ? String(mobile).trim() : null;
    await dbHelper.run('UPDATE students SET mobile = ? WHERE usn = ?', [cleanMobile, usn]);
    updatedMobile = cleanMobile;
  }

  await dbHelper.run(`
    UPDATE academic_records
    SET cgpa = COALESCE(?, cgpa),
        tenth_percentage = COALESCE(?, tenth_percentage),
        tenth_year = COALESCE(?, tenth_year),
        twelfth_percentage = COALESCE(?, twelfth_percentage),
        twelfth_year = COALESCE(?, twelfth_year),
        branch = COALESCE(?, branch),
        active_backlogs = COALESCE(?, active_backlogs),
        backlog_history_count = COALESCE(?, backlog_history_count),
        graduation_year = COALESCE(?, graduation_year),
        education_gap_months = COALESCE(?, education_gap_months),
        verification_status = 'VERIFIED',
        verified_by = ?,
        verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE usn = ?
  `, [
    cgpa !== undefined ? Number(cgpa) : null,
    tenth_percentage !== undefined ? Number(tenth_percentage) : null,
    tenth_year !== undefined && tenth_year !== '' ? Number(tenth_year) : null,
    twelfth_percentage !== undefined ? Number(twelfth_percentage) : null,
    twelfth_year !== undefined && twelfth_year !== '' ? Number(twelfth_year) : null,
    branch ? branch.toUpperCase().trim() : null,
    active_backlogs !== undefined ? Number(active_backlogs) : null,
    backlog_history_count !== undefined ? Number(backlog_history_count) : null,
    graduation_year !== undefined ? Number(graduation_year) : null,
    education_gap_months !== undefined ? Number(education_gap_months) : null,
    req.user.name || 'Placement Cell Officer',
    usn
  ]);

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'STUDENT_RECORD_MODIFIED_BY_ADMIN',
    entityType: 'STUDENT_RECORD',
    entityId: usn,
    oldValues: {
      cgpa: existing.cgpa,
      active_backlogs: existing.active_backlogs,
      branch: existing.branch,
      dob: targetStudent.dob,
      email: targetStudent.email,
      mobile: targetStudent.mobile
    },
    newValues: {
      cgpa,
      active_backlogs,
      branch,
      dob: updatedDob,
      email: updatedEmail,
      mobile: updatedMobile,
      reason
    },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: `Verified student record for ${usn} (academics, DOB & contact info) updated and certified by placement officer.`,
    usn,
    email: updatedEmail,
    mobile: updatedMobile,
    dob: updatedDob
  });
}
