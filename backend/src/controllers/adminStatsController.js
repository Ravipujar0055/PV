import { dbHelper } from '../config/database.js';

export async function getDashboardStats(req, res) {
  try {
    const [statsRow, recentMismatches, drives, branchDistribution] = await Promise.all([
      dbHelper.get(`
        SELECT 
          (SELECT COUNT(*) FROM students) as totalStudents,
          (SELECT COUNT(*) FROM companies) as totalCompanies,
          (SELECT COUNT(*) FROM placement_drives) as totalDrives,
          (SELECT COUNT(*) FROM applications) as totalApplications,
          (SELECT COUNT(*) FROM applications WHERE eligibility_status = 'ELIGIBLE') as eligibleApplications,
          (SELECT COUNT(DISTINCT usn) FROM data_mismatches WHERE status IN ('flagged', 'pending_review')) as flaggedStudents,
          (SELECT COUNT(*) FROM data_mismatches) as totalMismatches,
          (SELECT COUNT(*) FROM applications WHERE application_status = 'selected') as selectedStudents,
          (SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'blocked') as blockedStudents
      `),
      dbHelper.all(`
        SELECT m.*, s.name as student_name, ar.branch
        FROM data_mismatches m
        LEFT JOIN students s ON s.usn = m.usn
        LEFT JOIN academic_records ar ON ar.usn = m.usn
        ORDER BY m.created_at DESC
        LIMIT 6
      `),
      dbHelper.all(`
        SELECT d.id, d.title, d.role, d.ctc_lpa, d.drive_date, d.deadline, d.status,
               c.name as company_name,
               (SELECT COUNT(*) FROM applications WHERE drive_id = d.id) as applicant_count
        FROM placement_drives d
        JOIN companies c ON c.id = d.company_id
        ORDER BY d.drive_date ASC
        LIMIT 5
      `),
      dbHelper.all(`
        SELECT branch, COUNT(*) as count 
        FROM academic_records 
        GROUP BY branch
      `)
    ]);

    return res.json({
      stats: {
        totalStudents: Number(statsRow?.totalStudents) || 0,
        totalCompanies: Number(statsRow?.totalCompanies) || 0,
        totalDrives: Number(statsRow?.totalDrives) || 0,
        totalApplications: Number(statsRow?.totalApplications) || 0,
        eligibleApplications: Number(statsRow?.eligibleApplications) || 0,
        flaggedStudents: Number(statsRow?.flaggedStudents) || 0,
        totalMismatches: Number(statsRow?.totalMismatches) || 0,
        selectedStudents: Number(statsRow?.selectedStudents) || 0,
        blockedStudents: Number(statsRow?.blockedStudents) || 0
      },
      recentMismatches: recentMismatches || [],
      drives: drives || [],
      branchDistribution: branchDistribution || []
    });
  } catch (err) {
    console.error('Error in getDashboardStats:', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
}

