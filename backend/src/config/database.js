import { mysqlHelper, initMysqlDatabase, pool } from './mysqlDatabase.js';

/**
 * VeriPlace Database Module
 * Direct MySQL Relational Database integration
 */
export async function initDatabase() {
  await initMysqlDatabase();
}

export const dbHelper = mysqlHelper;
export { pool };

export default { dbHelper, initDatabase, pool };
