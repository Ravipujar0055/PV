import { dbHelper } from '../config/database.js';
import { logAudit } from '../services/auditService.js';
import { recordDiscrepancies } from '../services/mismatchDetector.js';
import crypto from 'node:crypto';

export async function getMeProfile(req, res) {
  const student = await dbHelper.get(`
    SELECT s.*, u.email as user_email, u.status as account_status
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ?
  `, [req.user.id]);

  if (!student) {
    return res.status(404).json({ error: 'Student record not found.' });
  }

  // Institutional Verified Academic Record
  const academicRecord = await dbHelper.get(`
    SELECT * FROM academic_records WHERE student_id = ?
  `, [student.id]);

  // Student Editable Profile
  let profile = await dbHelper.get(`
    SELECT * FROM student_profiles WHERE student_id = ?
  `, [student.id]);

  if (!profile) {
    // If not exists, initialize blank
    profile = {
      projects: '[]',
      skills: '[]',
      certifications: '[]',
      resume_filename: null,
      resume_path: null,
      resume_url: null
    };
  }

  // Active Discrepancies (if any)
  const mismatches = await dbHelper.all(`
    SELECT * FROM data_mismatches WHERE usn = ? ORDER BY created_at DESC
  `, [student.usn]);

  return res.json({
    personal: {
      id: student.id,
      usn: student.usn,
      name: student.name,
      email: student.email,
      mobile: student.mobile,
      gender: student.gender,
      dob: student.dob,
      accountStatus: student.account_status
    },
    verifiedAcademic: academicRecord ? {
      ...academicRecord,
      isLocked: true,
      institutionalBadge: '✓ Verified by Institution'
    } : null,
    profile: {
      projects: JSON.parse(profile.projects || '[]'),
      skills: JSON.parse(profile.skills || '[]'),
      certifications: JSON.parse(profile.certifications || '[]'),
      resumeFilename: profile.resume_filename,
      resumePath: profile.resume_path,
      resumeUrl: profile.resume_url || profile.resume_path || null
    },
    mismatches: mismatches || []
  });
}

/**
 * Updates student-editable sections (Projects, Skills, Certifications).
 * CRITICAL SECURITY RULE:
 * If the payload contains academic fields (CGPA, backlogs, branch, 10th, 12th),
 * the server explicitly discards them and logs a potential tampering attempt!
 */
export async function updateStudentProfile(req, res) {
  const student = await dbHelper.get('SELECT id, usn, name FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  const { projects, skills, certifications, cgpa, active_backlogs, branch, tenth_percentage, twelfth_percentage, email, mobile, phone } = req.body;

  // Handle personal contact updates (email, phone / mobile ONLY)
  if (email !== undefined || mobile !== undefined || phone !== undefined) {
    const newEmail = email !== undefined ? String(email).trim() : undefined;
    const newMobile = (mobile !== undefined ? mobile : phone) !== undefined ? String(mobile !== undefined ? mobile : phone).trim() : undefined;

    if (newEmail) {
      const existingUser = await dbHelper.get('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, req.user.id]);
      if (existingUser) {
        return res.status(400).json({ error: 'This email address is already registered to another account.' });
      }
      await dbHelper.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);
      await dbHelper.run('UPDATE students SET email = ? WHERE id = ?', [newEmail, student.id]);
    }
    if (newMobile !== undefined) {
      await dbHelper.run('UPDATE students SET mobile = ? WHERE id = ?', [newMobile, student.id]);
    }
  }

  // Detect if student attempted to tamper with locked academic data
  if (cgpa !== undefined || active_backlogs !== undefined || branch !== undefined || tenth_percentage !== undefined || twelfth_percentage !== undefined) {
    const verified = await dbHelper.get('SELECT * FROM academic_records WHERE student_id = ?', [student.id]);
    
    // Check if the attempted values differ from verified
    const attemptedDiffs = [];
    if (cgpa !== undefined && Number(cgpa) !== Number(verified.cgpa)) {
      attemptedDiffs.push({ fieldName: 'CGPA', submittedValue: String(cgpa), verifiedValue: String(verified.cgpa), severity: 'HIGH', notes: 'Unauthorized attempt to modify locked CGPA via API' });
    }
    if (active_backlogs !== undefined && Number(active_backlogs) !== Number(verified.active_backlogs)) {
      attemptedDiffs.push({ fieldName: 'Active Backlogs', submittedValue: String(active_backlogs), verifiedValue: String(verified.active_backlogs), severity: 'HIGH', notes: 'Unauthorized attempt to modify locked backlogs via API' });
    }

    if (attemptedDiffs.length > 0) {
      await recordDiscrepancies(
        { hasDiscrepancy: true, discrepancies: attemptedDiffs, usn: student.usn, studentId: student.id },
        'tampered_payload',
        { id: req.user.id, name: student.name, role: 'student' }
      );
    }

    await logAudit({
      userId: req.user.id,
      userName: student.name,
      role: 'student',
      action: 'UNAUTHORIZED_FIELD_MODIFICATION_ATTEMPT',
      entityType: 'STUDENT_PROFILE',
      entityId: student.usn,
      newValues: { cgpa, active_backlogs, branch },
      ipAddress: req.ip || '127.0.0.1',
      notes: 'Student attempted to modify institutional locked academic fields via client request.'
    });
  }

  // Sanitize and save only legitimate editable fields
  const safeProjects = Array.isArray(projects) ? JSON.stringify(projects) : '[]';
  const safeSkills = Array.isArray(skills) ? JSON.stringify(skills) : '[]';
  const safeCertifications = Array.isArray(certifications) ? JSON.stringify(certifications) : '[]';

  const existing = await dbHelper.get('SELECT id FROM student_profiles WHERE student_id = ?', [student.id]);

  if (existing) {
    await dbHelper.run(`
      UPDATE student_profiles 
      SET projects = ?, skills = ?, certifications = ?, updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `, [safeProjects, safeSkills, safeCertifications, student.id]);
  } else {
    await dbHelper.run(`
      INSERT INTO student_profiles (id, student_id, projects, skills, certifications)
      VALUES (?, ?, ?, ?, ?)
    `, [crypto.randomUUID(), student.id, safeProjects, safeSkills, safeCertifications]);
  }

  await logAudit({
    userId: req.user.id,
    userName: student.name,
    role: 'student',
    action: 'STUDENT_PROFILE_UPDATED',
    entityType: 'STUDENT_PROFILE',
    entityId: student.usn,
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: 'Profile updated successfully. Note: Academic records remain locked and verified by the institution.',
    verifiedBadge: '✓ Verified by Institution'
  });
}

/**
 * Updates personal contact information (email & phone number ONLY)
 */
export async function updateStudentContactInfo(req, res) {
  const student = await dbHelper.get('SELECT id, user_id, usn, name, email, mobile FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ error: 'Student record not found.' });
  }

  const { email, mobile, phone } = req.body;
  const newEmail = email !== undefined ? String(email).trim() : undefined;
  const newMobile = (mobile !== undefined ? mobile : phone) !== undefined ? String(mobile !== undefined ? mobile : phone).trim() : undefined;

  if (newEmail !== undefined && !newEmail) {
    return res.status(400).json({ error: 'Email address cannot be blank.' });
  }

  const updates = [];
  const params = [];

  if (newEmail !== undefined && newEmail !== student.email) {
    // Check if email is already taken by another account
    const existingUser = await dbHelper.get('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, req.user.id]);
    if (existingUser) {
      return res.status(400).json({ error: 'This email address is already registered to another account.' });
    }
    await dbHelper.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);
    updates.push('email = ?');
    params.push(newEmail);
  }

  if (newMobile !== undefined && newMobile !== student.mobile) {
    updates.push('mobile = ?');
    params.push(newMobile);
  }

  if (updates.length > 0) {
    params.push(student.id);
    await dbHelper.run(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      userId: req.user.id,
      userName: student.name,
      role: 'student',
      action: 'STUDENT_CONTACT_INFO_UPDATED',
      entityType: 'STUDENT',
      entityId: student.usn,
      oldValues: { email: student.email, mobile: student.mobile },
      newValues: { email: newEmail, mobile: newMobile },
      ipAddress: req.ip || '127.0.0.1'
    });
  }

  return res.json({
    message: 'Personal contact details (email & phone) updated successfully!',
    email: newEmail !== undefined ? newEmail : student.email,
    mobile: newMobile !== undefined ? newMobile : student.mobile
  });
}

export async function uploadStudentResumeFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const student = await dbHelper.get('SELECT id, usn, name FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const relativePath = `/uploads/${req.file.filename}`;

  const existing = await dbHelper.get('SELECT id FROM student_profiles WHERE student_id = ?', [student.id]);
  if (existing) {
    await dbHelper.run(`
      UPDATE student_profiles 
      SET resume_filename = ?, resume_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `, [req.file.originalname, relativePath, student.id]);
  } else {
    await dbHelper.run(`
      INSERT INTO student_profiles (id, student_id, resume_filename, resume_path)
      VALUES (?, ?, ?, ?)
    `, [crypto.randomUUID(), student.id, req.file.originalname, relativePath]);
  }

  await logAudit({
    userId: req.user.id,
    userName: student.name,
    role: 'student',
    action: 'RESUME_UPLOADED',
    entityType: 'RESUME',
    entityId: student.usn,
    newValues: { filename: req.file.originalname, path: relativePath },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: 'Resume uploaded successfully.',
    resumeFilename: req.file.originalname,
    resumePath: relativePath
  });
}

export async function updateResumeLink(req, res) {
  const { resumeUrl } = req.body;
  if (!resumeUrl || typeof resumeUrl !== 'string' || !resumeUrl.trim().toLowerCase().startsWith('http')) {
    return res.status(400).json({ error: 'Please provide a valid public drive URL (starting with http:// or https://).' });
  }

  const student = await dbHelper.get('SELECT id, usn, name FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ error: 'Student record not found.' });
  }

  const cleanUrl = resumeUrl.trim();
  const existing = await dbHelper.get('SELECT id FROM student_profiles WHERE student_id = ?', [student.id]);
  if (existing) {
    await dbHelper.run(`
      UPDATE student_profiles 
      SET resume_url = ?, resume_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `, [cleanUrl, cleanUrl, student.id]);
  } else {
    await dbHelper.run(`
      INSERT INTO student_profiles (id, student_id, resume_url, resume_path)
      VALUES (?, ?, ?, ?)
    `, [crypto.randomUUID(), student.id, cleanUrl, cleanUrl]);
  }

  // Also update active applications for this student with the new resume URL
  await dbHelper.run('UPDATE applications SET resume_url = ? WHERE student_id = ?', [cleanUrl, student.id]);

  await logAudit({
    userId: req.user.id,
    userName: student.name,
    role: 'student',
    action: 'RESUME_DRIVE_LINK_UPDATED',
    entityType: 'RESUME',
    entityId: student.usn,
    newValues: { resumeUrl: cleanUrl },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    message: 'Public resume drive link saved successfully.',
    resumeUrl: cleanUrl
  });
}

export async function getStudentApplicationsList(req, res) {
  const student = await dbHelper.get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const applications = await dbHelper.all(`
    SELECT a.*, d.title as drive_title, d.role as job_role, d.ctc_lpa, d.location, d.drive_date,
           c.name as company_name, c.industry as company_industry
    FROM applications a
    JOIN placement_drives d ON d.id = a.drive_id
    JOIN companies c ON c.id = d.company_id
    WHERE a.student_id = ?
    ORDER BY a.applied_at DESC
  `, [student.id]);

  const parsed = applications.map(app => {
    let snapshot = null;
    try {
      snapshot = JSON.parse(app.eligibility_snapshot);
    } catch {
      snapshot = null;
    }
    return {
      ...app,
      eligibility_snapshot: snapshot
    };
  });

  return res.json({ applications: parsed });
}
