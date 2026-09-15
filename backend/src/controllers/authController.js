import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbHelper } from '../config/database.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { logAudit } from '../services/auditService.js';

/**
 * Normalizes Date of Birth strings to standard YYYY-MM-DD
 * Handles:
 * - YYYY-MM-DD / YYYY/MM/DD
 * - DD-MM-YYYY / DD/MM/YYYY
 * - DD.MM.YYYY
 */
export function normalizeDob(dobStr) {
  if (!dobStr) return '';
  let clean = String(dobStr).trim();
  if (clean.includes('T')) clean = clean.split('T')[0];
  if (clean.includes(' ')) clean = clean.split(' ')[0];

  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  return clean;
}

export async function login(req, res) {
  const { identifier, usn, password, dob } = req.body;

  const targetIdentifier = (usn || identifier || '').trim();

  if (!targetIdentifier) {
    return res.status(400).json({ error: 'USN or Email/Username is required.' });
  }

  // CASE 1: Student Login with USN + Date of Birth (DOB)
  if (dob !== undefined && dob !== null && String(dob).trim() !== '') {
    const student = await dbHelper.get(`
      SELECT s.*, u.id as user_id, u.username, u.email as user_email, u.status as account_status, u.role
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE UPPER(s.usn) = UPPER(?) 
         OR LOWER(u.username) = LOWER(?)
         OR LOWER(s.name) = LOWER(?)
         OR LOWER(s.email) = LOWER(?)
         OR LOWER(u.email) = LOWER(?)
    `, [targetIdentifier, targetIdentifier, targetIdentifier, targetIdentifier, targetIdentifier]);

    if (!student) {
      return res.status(401).json({ error: `No student record found for USN or identifier "${targetIdentifier}". Please check your USN or contact Placement Cell.` });
    }

    if (student.account_status === 'blocked') {
      return res.status(403).json({
        error: 'Your placement account has been BLOCKED due to institutional academic discrepancies. Contact Placement Cell.',
        isBlocked: true
      });
    }

    const storedNormDob = normalizeDob(student.dob);
    const submittedNormDob = normalizeDob(dob);

    if (!storedNormDob || storedNormDob !== submittedNormDob) {
      const hint = student.dob === '2003-01-01' 
        ? ' (Note: Bulk-imported student records have default registered DOB as 2003-01-01).' 
        : '';
      return res.status(401).json({
        error: `Invalid Date of Birth for USN ${student.usn}.${hint} Please enter your registered date of birth.`
      });
    }

    // DOB matched! Issue JWT token
    const token = jwt.sign(
      {
        id: student.user_id,
        username: student.username,
        role: student.role,
        usn: student.usn,
        studentId: student.id,
        name: student.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit({
      userId: student.user_id,
      userName: student.name,
      role: 'student',
      action: 'STUDENT_DOB_LOGIN',
      entityType: 'USER',
      entityId: student.user_id,
      ipAddress: req.ip || '127.0.0.1'
    });

    return res.json({
      token,
      user: {
        id: student.user_id,
        username: student.username,
        email: student.email || student.user_email,
        role: student.role,
        status: student.account_status,
        name: student.name,
        usn: student.usn,
        studentId: student.id
      }
    });
  }

  // CASE 2: Staff / Admin / Recruiter / Password-based Login
  if (!password) {
    return res.status(400).json({ error: 'Date of Birth (for students) or password is required.' });
  }

  const normalized = targetIdentifier.toLowerCase();
  let user = await dbHelper.get(`
    SELECT u.*, s.usn, s.name, s.id as student_id 
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    WHERE LOWER(u.username) = ? OR LOWER(u.email) = ? OR LOWER(s.usn) = ?
  `, [normalized, normalized, normalized]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({
      error: 'Your placement account has been BLOCKED due to institutional academic discrepancies. Contact Placement Cell.',
      isBlocked: true
    });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      usn: user.usn,
      studentId: user.student_id,
      name: user.name || user.username
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  await logAudit({
    userId: user.id,
    userName: user.name || user.username,
    role: user.role,
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.name || user.username,
      usn: user.usn,
      studentId: user.student_id
    }
  });
}

export async function getCurrentUser(req, res) {
  const user = await dbHelper.get(`
    SELECT u.id, u.username, u.email, u.role, u.status, s.usn, s.name, s.dob, s.id as student_id
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    WHERE u.id = ?
  `, [req.user.id]);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user });
}

export async function getDemoAccounts(req, res) {
  const adminExists = Boolean(await dbHelper.get('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']));
  const student1 = await dbHelper.get('SELECT id, dob FROM students WHERE LOWER(usn) = ? LIMIT 1', ['1ms21cs001']);
  const student2 = await dbHelper.get('SELECT id, dob FROM students WHERE LOWER(usn) = ? LIMIT 1', ['1ms21cs042']);
  const recUserRecord = await dbHelper.get("SELECT email, username FROM users WHERE role = 'recruiter' LIMIT 1");
  const recruiterExists = Boolean(recUserRecord);

  return res.json({
    demoAccounts: [
      {
        role: 'admin',
        title: 'Placement Officer / Admin',
        identifier: 'admin@placement.edu',
        password: 'Admin@123',
        description: 'Full administrative access: drive creation, verified DB management, fraud detection & audit.',
        isAvailable: adminExists
      },
      {
        role: 'student_eligible',
        title: 'Student: Ravi (Eligible)',
        identifier: '1MS21CS001',
        dob: student1?.dob || '2003-05-14',
        password: 'Student@123',
        description: `Verified CGPA 8.65, 0 Backlogs. Login with USN + DOB (${student1?.dob || '2003-05-14'}). Meets criteria for placement drives.`,
        isAvailable: Boolean(student1)
      },
      {
        role: 'student_ineligible',
        title: 'Student: Rahul Sharma (Criteria Mismatch)',
        identifier: '1MS21CS042',
        dob: student2?.dob || '2003-08-22',
        password: 'Student@123',
        description: `Verified CGPA 6.80, 1 Backlog. Login with USN + DOB (${student2?.dob || '2003-08-22'}). Ineligible drives are hidden.`,
        isAvailable: Boolean(student2)
      },
      {
        role: 'recruiter',
        title: 'Recruiter Partner Portal',
        identifier: recUserRecord?.email || recUserRecord?.username || 'recruiter@abc-tech.com',
        password: 'Recruiter@123',
        description: 'Company recruiter portal: view verified applicants, download resumes, advance recruitment stages.',
        isAvailable: recruiterExists
      }
    ]
  });
}

export async function demoLogin(req, res) {
  const { demoType } = req.body;
  let targetIdentifier = '';

  if (demoType === 'admin') {
    targetIdentifier = process.env.ADMIN_EMAIL || 'admin@placement.edu';
  } else if (demoType === 'student_eligible') {
    targetIdentifier = '1ms21cs001';
  } else if (demoType === 'student_ineligible') {
    targetIdentifier = '1ms21cs042';
  } else if (demoType === 'recruiter') {
    const recUser = await dbHelper.get("SELECT email, username FROM users WHERE role = 'recruiter' LIMIT 1");
    targetIdentifier = recUser?.email || recUser?.username || 'recruiter@abc-tech.com';
  } else {
    return res.status(400).json({ error: 'Invalid demo account type.' });
  }

  const user = await dbHelper.get(`
    SELECT u.*, s.usn, s.name, s.dob, s.id as student_id 
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    WHERE LOWER(u.username) = ? OR LOWER(u.email) = ? OR LOWER(s.usn) = ?
  `, [targetIdentifier.toLowerCase(), targetIdentifier.toLowerCase(), targetIdentifier.toLowerCase()]);

  if (!user) {
    if (demoType === 'admin') {
      return res.status(404).json({ error: 'Admin account not found. Please run "npm run db:setup-mysql" in backend.' });
    }
    return res.status(404).json({ 
      error: `This student account (${targetIdentifier}) has not been imported yet in the database.` 
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      usn: user.usn,
      studentId: user.student_id,
      name: user.name || user.username
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  await logAudit({
    userId: user.id,
    userName: user.name || user.username,
    role: user.role,
    action: 'DEMO_SWITCH_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.name || user.username,
      usn: user.usn,
      studentId: user.student_id
    }
  });
}

export async function updateUserProfile(req, res) {
  const userId = req.user.id;
  const { email, mobile, phone, name, username, currentPassword, newPassword } = req.body;

  const user = await dbHelper.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  let updatedEmail = user.email;
  if (email && email.trim() !== '') {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const conflict = await dbHelper.get('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [cleanEmail, userId]);
    if (conflict) {
      return res.status(400).json({ error: 'This email is already in use by another account.' });
    }

    await dbHelper.run('UPDATE users SET email = ? WHERE id = ?', [cleanEmail, userId]);
    if (user.role === 'student') {
      await dbHelper.run('UPDATE students SET email = ? WHERE user_id = ?', [cleanEmail, userId]);
    }
    updatedEmail = cleanEmail;
  }

  let updatedUsername = user.username;
  if (username && username.trim() !== '' && username.trim() !== user.username) {
    const cleanUsername = username.trim().toLowerCase();
    const usernameConflict = await dbHelper.get('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?', [cleanUsername, userId]);
    if (usernameConflict) {
      return res.status(400).json({ error: `Username "${cleanUsername}" is already taken.` });
    }
    await dbHelper.run('UPDATE users SET username = ? WHERE id = ?', [cleanUsername, userId]);
    updatedUsername = cleanUsername;
  }

  // Password update
  if (newPassword && newPassword.trim() !== '') {
    if (newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (currentPassword) {
      const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    const newHash = bcrypt.hashSync(newPassword.trim(), 10);
    await dbHelper.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    
    await logAudit({
      userId: user.id,
      userName: updatedUsername,
      role: user.role,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip || '127.0.0.1'
    });
  }

  const cleanMobile = (mobile || phone) !== undefined ? String(mobile || phone).trim() : null;
  if (cleanMobile && user.role === 'student') {
    await dbHelper.run('UPDATE students SET mobile = ? WHERE user_id = ?', [cleanMobile, userId]);
  }

  await logAudit({
    userId: user.id,
    userName: updatedUsername,
    role: user.role,
    action: 'USER_PROFILE_UPDATED',
    entityType: 'USER',
    entityId: user.id,
    oldValues: { email: user.email, username: user.username },
    newValues: { email: updatedEmail, username: updatedUsername, mobile: cleanMobile },
    ipAddress: req.ip || '127.0.0.1'
  });

  const updatedUser = await dbHelper.get(`
    SELECT u.id, u.username, u.email, u.role, u.status, s.usn, s.name, s.dob, s.mobile, s.id as student_id
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    WHERE u.id = ?
  `, [userId]);

  return res.json({
    message: 'Profile contact details updated successfully.',
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      name: updatedUser.name || updatedUser.username,
      usn: updatedUser.usn,
      studentId: updatedUser.student_id,
      mobile: updatedUser.mobile
    }
  });
}

