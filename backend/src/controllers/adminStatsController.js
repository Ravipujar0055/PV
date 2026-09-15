import { dbHelper } from '../config/database.js';

export async function getDashboardStats(req, res) {
  const totalStudents = (await dbHelper.get('SELECT COUNT(*) as c FROM students'))?.c || 0;
  const totalCompanies = (await dbHelper.get('SELECT COUNT(*) as c FROM companies'))?.c || 0;
  const totalDrives = (await dbHelper.get('SELECT COUNT(*) as c FROM placement_drives'))?.c || 0;
  const totalApplications = (await dbHelper.get('SELECT COUNT(*) as c FROM applications'))?.c || 0;
  const eligibleApplications = (await dbHelper.get("SELECT COUNT(*) as c FROM applications WHERE eligibility_status = 'ELIGIBLE'"))?.c || 0;
  const flaggedStudents = (await dbHelper.get("SELECT COUNT(DISTINCT usn) as c FROM data_mismatches WHERE status IN ('flagged', 'pending_review')"))?.c || 0;
  const totalMismatches = (await dbHelper.get('SELECT COUNT(*) as c FROM data_mismatches'))?.c || 0;
  const selectedStudents = (await dbHelper.get("SELECT COUNT(*) as c FROM applications WHERE application_status = 'selected'"))?.c || 0;
  const blockedStudents = (await dbHelper.get("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND status = 'blocked'"))?.c || 0;

  // Recent Mismatches
  const recentMismatches = await dbHelper.all(`
    SELECT m.*, s.name as student_name, ar.branch
    FROM data_mismatches m
    LEFT JOIN students s ON s.usn = m.usn
    LEFT JOIN academic_records ar ON ar.usn = m.usn
    ORDER BY m.created_at DESC
    LIMIT 6
  `);

  // Upcoming & Active Drives
  const drives = await dbHelper.all(`
    SELECT d.id, d.title, d.role, d.ctc_lpa, d.drive_date, d.deadline, d.status,
           c.name as company_name,
           (SELECT COUNT(*) FROM applications WHERE drive_id = d.id) as applicant_count
    FROM placement_drives d
    JOIN companies c ON c.id = d.company_id
    ORDER BY d.drive_date ASC
    LIMIT 5
  `);

  // Branch-wise distribution of students
  const branchDistribution = await dbHelper.all(`
    SELECT branch, COUNT(*) as count 
    FROM academic_records 
    GROUP BY branch
  `);

  return res.json({
    stats: {
      totalStudents,
      totalCompanies,
      totalDrives,
      totalApplications,
      eligibleApplications,
      flaggedStudents,
      totalMismatches,
      selectedStudents,
      blockedStudents
    },
    recentMismatches,
    drives,
    branchDistribution
  });
}
