import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = Number(process.env.MYSQL_PORT);
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

// Configure SSL/TLS for Cloud databases (TiDB Cloud, Aiven, etc.)
function getSslConfig() {
  const isCloud = MYSQL_HOST && (MYSQL_HOST.includes('tidbcloud.com') || MYSQL_HOST.includes('aivencloud.com') || process.env.MYSQL_CA_CERT || process.env.MYSQL_SSL === 'true');
  if (!isCloud) return undefined;

  let ca;
  if (process.env.MYSQL_CA_CERT) {
    const certPath = path.isAbsolute(process.env.MYSQL_CA_CERT)
      ? process.env.MYSQL_CA_CERT
      : path.resolve(__dirname, '../../', process.env.MYSQL_CA_CERT);
    if (fs.existsSync(certPath)) {
      ca = fs.readFileSync(certPath);
    }
  }

  return {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    ...(ca ? { ca } : {})
  };
}

const sslConfig = getSslConfig();

// Create connection pool
export const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true,
  decimalNumbers: true,
  ...(sslConfig ? { ssl: sslConfig } : {})
});

export async function checkMysqlConnection() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT 1 as connected');
    return rows[0]?.connected === 1;
  } finally {
    conn.release();
  }
}

export const mysqlHelper = {
  async get(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
    return null;
  },

  async all(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return Array.isArray(rows) ? rows : [];
  },

  async run(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return {
      changes: result.affectedRows || 0,
      lastInsertRowid: result.insertId || 0
    };
  },

  async exec(sql) {
    const [result] = await pool.query(sql);
    return result;
  }
};

export async function initMysqlDatabase() {
  // 1. Ensure database exists
  const rootConn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
    ...(sslConfig ? { ssl: sslConfig } : {})
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } finally {
    await rootConn.end();
  }

  // 2. Run schema.mysql.sql
  const schemaPath = path.join(__dirname, 'schema.mysql.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
  }

  // 3. Ensure Primary Administrator account exists & sync from .env if defined
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@placement.edu';
  const adminPassword = process.env.ADMIN_PASSWORD;

  const existingAdmin = await mysqlHelper.get('SELECT id, username, email, password_hash FROM users WHERE role = ? LIMIT 1', ['admin']);
  if (!existingAdmin) {
    const adminId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(adminPassword || 'Admin@123', 10);

    await mysqlHelper.run(`
      INSERT INTO users (id, username, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'admin', 'active')
    `, [adminId, adminUsername, adminEmail, passwordHash]);

    await mysqlHelper.run(`
      INSERT INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, new_values, ip_address)
      VALUES (?, ?, 'System Setup', 'admin', 'SYSTEM_INITIALIZED', 'SYSTEM', 'ROOT', ?, '127.0.0.1')
    `, [
      crypto.randomUUID(),
      adminId,
      JSON.stringify({ status: 'MYSQL_DATABASE_INITIALIZED', adminEmail, engine: 'MySQL 5.6' })
    ]);
  } else if (adminPassword) {
    // If ADMIN_PASSWORD is set in .env and differs from existing hash, update it
    const isSamePassword = bcrypt.compareSync(adminPassword, existingAdmin.password_hash);
    const isSameUsername = existingAdmin.username === adminUsername;
    const isSameEmail = existingAdmin.email === adminEmail;

    if (!isSamePassword || !isSameUsername || !isSameEmail) {
      const newHash = isSamePassword ? existingAdmin.password_hash : bcrypt.hashSync(adminPassword, 10);
      await mysqlHelper.run(`
        UPDATE users 
        SET username = ?, email = ?, password_hash = ?
        WHERE id = ?
      `, [adminUsername, adminEmail, newHash, existingAdmin.id]);
      console.log(`[Admin Credentials] Synchronized admin credentials from .env for user: ${adminUsername}`);
    }
  }
}

export default pool;
