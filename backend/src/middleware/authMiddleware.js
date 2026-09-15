import jwt from 'jsonwebtoken';
import { dbHelper } from '../config/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'placement-secret-key-2026-institutional-grade';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    try {
      // Verify user is still active in database
      const dbUser = await dbHelper.get('SELECT id, username, role, status FROM users WHERE id = ?', [user.id]);
      if (!dbUser) {
        return res.status(401).json({ error: 'User account not found.' });
      }

      if (dbUser.status === 'blocked') {
        return res.status(403).json({
          error: 'Your placement account has been BLOCKED due to institutional academic discrepancies.',
          isBlocked: true
        });
      }

      req.user = {
        ...user,
        status: dbUser.status
      };

      // If student, attach student profile details
      if (dbUser.role === 'student') {
        const student = await dbHelper.get('SELECT id, usn, name FROM students WHERE user_id = ?', [dbUser.id]);
        if (student) {
          req.user.studentId = student.id;
          req.user.usn = student.usn;
          req.user.name = student.name;
        }
      }

      next();
    } catch (dbErr) {
      console.error('Auth verification error:', dbErr);
      return res.status(500).json({ error: 'Authentication database check failed.' });
    }
  });
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden. Requires role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}
