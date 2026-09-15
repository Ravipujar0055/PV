import { dbHelper } from '../config/database.js';
import crypto from 'node:crypto';

export async function logAudit({
  userId = null,
  userName = 'System',
  role = 'system',
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = '127.0.0.1',
  notes = null
}) {
  try {
    const id = crypto.randomUUID();
    const oldValJson = oldValues ? JSON.stringify(oldValues) : null;
    const newValJson = newValues ? JSON.stringify(newValues) : null;

    await dbHelper.run(`
      INSERT INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      userName,
      role,
      action,
      entityType,
      entityId,
      oldValJson,
      newValJson,
      ipAddress
    ]);
    return id;
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}

export async function getAuditLogs({ limit = 100, action = null, role = null, search = null }) {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }
  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  if (search) {
    query += ' AND (entity_id LIKE ? OR user_name LIKE ? OR action LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return await dbHelper.all(query, params);
}
