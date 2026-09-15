import { mysqlHelper, pool } from './mysqlDatabase.js';

async function viewMysql() {
  try {
    console.log('================================================================');
    console.log('       LOCAL MYSQL DATABASE INSPECTION: placement_verification   ');
    console.log('       Server: localhost:3306 | User: root                      ');
    console.log('================================================================\n');

    // 1. Table Statistics
    const tables = [
      'users',
      'students',
      'academic_records',
      'student_profiles',
      'companies',
      'placement_drives',
      'drive_requirements',
      'applications',
      'data_mismatches',
      'audit_logs',
      'external_form_submissions'
    ];

    console.log('--- RELATIONAL TABLE ROW COUNTS ---');
    for (const tbl of tables) {
      try {
        const res = await mysqlHelper.get(`SELECT COUNT(*) as cnt FROM \`${tbl}\``);
        console.log(`  • ${tbl.padEnd(28)} : ${res ? res.cnt : 0} rows`);
      } catch (e) {
        console.log(`  • ${tbl.padEnd(28)} : [table not initialized]`);
      }
    }

    // 2. View Student Records via View
    console.log('\n--- SAMPLE INSTITUTIONAL STUDENT RECORDS (v_student_academic_summary) ---');
    const students = await mysqlHelper.all(`
      SELECT usn, name, branch, cgpa, active_backlogs, verification_status, account_status
      FROM v_student_academic_summary
      ORDER BY usn ASC
      LIMIT 10
    `);

    if (students.length === 0) {
      console.log('  No student records found in MySQL.');
    } else {
      console.table(students);
      const totalStudents = await mysqlHelper.get('SELECT COUNT(*) as c FROM students');
      console.log(`  (Showing first 10 of ${totalStudents.c} students stored locally in MySQL)`);
    }

    // 3. Companies & Placement Drives
    console.log('\n--- ACTIVE PLACEMENT DRIVES ---');
    const drives = await mysqlHelper.all(`
      SELECT d.title, d.role, d.ctc_lpa, c.name as company_name, req.min_cgpa, req.max_active_backlogs
      FROM placement_drives d
      JOIN companies c ON c.id = d.company_id
      LEFT JOIN drive_requirements req ON req.drive_id = d.id
      LIMIT 5
    `);
    if (drives.length === 0) {
      console.log('  No placement drives created yet.');
    } else {
      console.table(drives);
    }

    // 4. Audit Trail
    console.log('\n--- RECENT AUDIT LOGS ---');
    const logs = await mysqlHelper.all(`
      SELECT action, user_name, role, entity_type, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);
    if (logs.length > 0) {
      console.table(logs);
    }

    console.log('\n================================================================');
    console.log(' HOW TO QUERY MYSQL FROM YOUR TERMINAL:                          ');
    console.log('   Command: & "C:\\Program Files\\MySQL\\MySQL Server 5.6\\bin\\mysql.exe" -u root -pravi placement_verification');
    console.log('   Example SQL:');
    console.log('     SELECT usn, name, cgpa FROM v_student_academic_summary LIMIT 5;');
    console.log('     SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error viewing MySQL database:', err);
    process.exit(1);
  }
}

viewMysql();
