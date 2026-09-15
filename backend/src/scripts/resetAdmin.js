import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { dbHelper } from '../config/database.js';

async function resetAdmin() {
  const args = process.argv.slice(2);
  const newUsername = args[0] || process.env.ADMIN_USERNAME;
  const newPassword = args[1] || process.env.ADMIN_PASSWORD;
  const newEmail = args[2] || process.env.ADMIN_EMAIL;

  console.log(`\n==============================================`);
  console.log(`Institutional Admin Account Reset Tool`);
  console.log(`==============================================`);
  console.log(`Target Username: ${newUsername}`);
  console.log(`Target Email:    ${newEmail}`);
  console.log(`Target Password: [PROTECTED (${newPassword.length} chars)]`);
  console.log(`Database Engine: ${process.env.DB_TYPE || 'mysql'}\n`);

  try {
    const existingAdmin = await dbHelper.get("SELECT id, username, email FROM users WHERE role = 'admin' LIMIT 1");
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    if (existingAdmin) {
      await dbHelper.run(
        "UPDATE users SET username = ?, email = ?, password_hash = ?, status = 'active' WHERE id = ?",
        [newUsername.trim().toLowerCase(), newEmail.trim().toLowerCase(), passwordHash, existingAdmin.id]
      );
      console.log(` SUCCESS: Admin user (${existingAdmin.username} -> ${newUsername}) credentials updated successfully!`);
    } else {
      const crypto = await import('node:crypto');
      const adminId = crypto.randomUUID();
      await dbHelper.run(
        "INSERT INTO users (id, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'admin', 'active')",
        [adminId, newUsername.trim().toLowerCase(), newEmail.trim().toLowerCase(), passwordHash]
      );
      console.log(` SUCCESS: New Admin user created: ${newUsername}`);
    }

    console.log(`\nYou can now sign in at http://localhost:3000 as Placement Officer using:`);
    console.log(`• Username / Identifier: ${newUsername} (or ${newEmail})`);
    console.log(`• Password:              ${newPassword}\n`);
    process.exit(0);
  } catch (err) {
    console.error(' ERROR: Failed to reset admin credentials:', err.message);
    process.exit(1);
  }
}

resetAdmin();
