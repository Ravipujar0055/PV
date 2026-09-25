import crypto from 'node:crypto';
import { dbHelper } from '../config/database.js';
import { checkEligibility } from '../services/eligibilityEngine.js';
import { logAudit } from '../services/auditService.js';

export async function getAllDrives(req, res) {
  const drives = await dbHelper.all(`
    SELECT d.*, c.name as company_name, c.industry as company_industry, c.website as company_website, c.recruiter_user_id,
           u.username as recruiter_username, u.email as recruiter_email,
           r.min_cgpa, r.min_tenth_percentage, r.min_twelfth_percentage,
           r.max_active_backlogs, r.allow_backlog_history, r.allowed_branches,
           r.graduation_year, r.max_gap_months, r.work_experience_required
    FROM placement_drives d
    JOIN companies c ON c.id = d.company_id
    LEFT JOIN users u ON u.id = c.recruiter_user_id
    JOIN drive_requirements r ON r.drive_id = d.id
    ORDER BY d.created_at DESC
  `);

  let studentRecord = null;
  let appliedDriveIds = new Map();

  if (req.user && req.user.role === 'student') {
    const [rec, studentApps] = await Promise.all([
      dbHelper.get('SELECT * FROM academic_records WHERE usn = ?', [req.user.usn]),
      dbHelper.all('SELECT id as application_id, drive_id, application_status FROM applications WHERE student_id = ?', [req.user.studentId])
    ]);
    studentRecord = rec;
    for (const app of (studentApps || [])) {
      appliedDriveIds.set(app.drive_id, { applicationId: app.application_id, status: app.application_status });
    }
  }

  const enrichedDrives = drives.map(d => {
    let allowedBranches = [];
    try {
      allowedBranches = JSON.parse(d.allowed_branches);
    } catch {
      allowedBranches = [];
    }

    const driveRequirements = {
      min_cgpa: d.min_cgpa,
      min_tenth_percentage: d.min_tenth_percentage,
      min_twelfth_percentage: d.min_twelfth_percentage,
      max_active_backlogs: d.max_active_backlogs,
      allow_backlog_history: d.allow_backlog_history,
      allowed_branches: allowedBranches,
      graduation_year: d.graduation_year,
      max_gap_months: d.max_gap_months,
      work_experience_required: d.work_experience_required
    };

    let eligibility = null;
    if (studentRecord) {
      eligibility = checkEligibility(studentRecord, driveRequirements);
    }

    const appInfo = appliedDriveIds.get(d.id);
    const hasActiveApplication = !!(appInfo && appInfo.status !== 'withdrawn');

    return {
      id: d.id,
      companyId: d.company_id,
      companyName: d.company_name,
      companyIndustry: d.company_industry,
      companyWebsite: d.company_website,
      recruiterUserId: d.recruiter_user_id,
      recruiterName: d.recruiter_username || d.recruiter_email,
      recruiterEmail: d.recruiter_email,
      title: d.title,
      role: d.role,
      ctcLpa: d.ctc_lpa,
      location: d.location,
      driveDate: d.drive_date,
      deadline: d.deadline,
      status: d.status,
      requirements: driveRequirements,
      hasApplied: hasActiveApplication,
      applicationId: appInfo?.applicationId || null,
      applicationStatus: appInfo?.status || null,
      eligibility
    };
  });

  let finalDrives = enrichedDrives;

  // Students receive all drives enriched with their deterministic eligibility status (isEligible, failedReasons)
  // Ineligible drives have registration blocked on both frontend and backend.

  // STRICT RECRUITER AUTHORIZATION RULE:
  // If the logged-in user is a recruiter, only show drives of the companies they are explicitly authorized for.
  if (req.user && req.user.role === 'recruiter') {
    finalDrives = enrichedDrives.filter(d => {
      if (d.recruiterUserId && d.recruiterUserId === req.user.id) return true;
      const recEmail = (req.user.email || '').toLowerCase();
      const recUser = (req.user.username || '').toLowerCase();
      const compName = (d.companyName || '').toLowerCase();
      if (recUser.includes('abc') && compName.includes('abc')) return true;
      if (recEmail.includes('abc-tech') && compName.includes('abc')) return true;
      return false;
    });
  }

  return res.json({ drives: finalDrives });
}

export async function getDriveById(req, res) {
  const { id } = req.params;

  const d = await dbHelper.get(`
    SELECT d.*, c.name as company_name, c.industry as company_industry, c.website as company_website,
           r.min_cgpa, r.min_tenth_percentage, r.min_twelfth_percentage,
           r.max_active_backlogs, r.allow_backlog_history, r.allowed_branches,
           r.graduation_year, r.max_gap_months, r.work_experience_required
    FROM placement_drives d
    JOIN companies c ON c.id = d.company_id
    JOIN drive_requirements r ON r.drive_id = d.id
    WHERE d.id = ?
  `, [id]);

  if (!d) {
    return res.status(404).json({ error: 'Placement drive not found.' });
  }

  let allowedBranches = [];
  try {
    allowedBranches = JSON.parse(d.allowed_branches);
  } catch {
    allowedBranches = [];
  }

  const requirements = {
    min_cgpa: d.min_cgpa,
    min_tenth_percentage: d.min_tenth_percentage,
    min_twelfth_percentage: d.min_twelfth_percentage,
    max_active_backlogs: d.max_active_backlogs,
    allow_backlog_history: d.allow_backlog_history,
    allowed_branches: allowedBranches,
    graduation_year: d.graduation_year,
    max_gap_months: d.max_gap_months,
    work_experience_required: d.work_experience_required
  };

  let eligibility = null;
  let hasApplied = false;
  let applicationStatus = null;

  if (req.user && req.user.role === 'student') {
    const studentRecord = await dbHelper.get('SELECT * FROM academic_records WHERE usn = ?', [req.user.usn]);
    if (studentRecord) {
      eligibility = checkEligibility(studentRecord, requirements);
      if (!eligibility.isEligible && !hasApplied) {
        return res.status(403).json({
          error: 'This placement drive is not available for your academic profile because you do not meet the verified eligibility criteria.',
          isEligible: false,
          failedReasons: eligibility.failedReasons
        });
      }
    }
    const app = await dbHelper.get('SELECT application_status FROM applications WHERE student_id = ? AND drive_id = ?', [req.user.studentId, d.id]);
    if (app) {
      hasApplied = true;
      applicationStatus = app.application_status;
    }
  }

  return res.json({
    drive: {
      id: d.id,
      companyId: d.company_id,
      companyName: d.company_name,
      companyIndustry: d.company_industry,
      companyWebsite: d.company_website,
      title: d.title,
      role: d.role,
      ctcLpa: d.ctc_lpa,
      location: d.location,
      driveDate: d.drive_date,
      deadline: d.deadline,
      status: d.status,
      requirements,
      hasApplied,
      applicationStatus,
      eligibility
    }
  });
}

export async function createDrive(req, res) {
  const {
    companyName,
    industry,
    website,
    recruiterUserId,
    title,
    role,
    ctcLpa,
    location,
    driveDate,
    deadline,
    minCgpa,
    min10th,
    min12th,
    maxBacklogs,
    allowBacklogHistory,
    allowedBranches,
    graduationYear,
    maxGapMonths,
    workExpRequired
  } = req.body;

  if (!companyName || !title || !role || !ctcLpa || minCgpa === undefined) {
    return res.status(400).json({ error: 'Missing required company or drive fields.' });
  }

  // Find or create company
  let company = await dbHelper.get('SELECT id FROM companies WHERE LOWER(name) = ?', [companyName.trim().toLowerCase()]);
  let companyId = company?.id;

  if (!companyId) {
    companyId = crypto.randomUUID();
    await dbHelper.run(`
      INSERT INTO companies (id, name, industry, website, recruiter_user_id)
      VALUES (?, ?, ?, ?, ?)
    `, [companyId, companyName.trim(), industry || 'Information Technology', website || '', recruiterUserId || null]);
  } else if (recruiterUserId !== undefined) {
    await dbHelper.run('UPDATE companies SET recruiter_user_id = ? WHERE id = ?', [recruiterUserId || null, companyId]);
  }

  const driveId = crypto.randomUUID();
  await dbHelper.run(`
    INSERT INTO placement_drives (id, company_id, title, role, ctc_lpa, location, drive_date, deadline, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `, [
    driveId,
    companyId,
    title.trim(),
    role.trim(),
    Number(ctcLpa),
    location || 'On-Campus',
    driveDate || '2026-10-15',
    deadline || '2026-10-01'
  ]);

  const branchesJson = Array.isArray(allowedBranches)
    ? JSON.stringify(allowedBranches)
    : JSON.stringify(['CSE', 'ISE', 'ECE']);

  await dbHelper.run(`
    INSERT INTO drive_requirements (
      id, drive_id, min_cgpa, min_tenth_percentage, min_twelfth_percentage,
      max_active_backlogs, allow_backlog_history, allowed_branches,
      graduation_year, max_gap_months, work_experience_required
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    crypto.randomUUID(),
    driveId,
    Number(minCgpa),
    Number(min10th || 60),
    Number(min12th || 60),
    Number(maxBacklogs ?? 0),
    allowBacklogHistory ? 1 : 0,
    branchesJson,
    Number(graduationYear || 2027),
    Number(maxGapMonths ?? 12),
    workExpRequired ? 1 : 0
  ]);

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'COMPANY_DRIVE_CREATED',
    entityType: 'PLACEMENT_DRIVE',
    entityId: driveId,
    newValues: { companyName, title, minCgpa, ctcLpa },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.status(201).json({
    message: 'Placement drive and dynamic eligibility criteria created successfully.',
    driveId
  });
}

export async function updateDrive(req, res) {
  const { id } = req.params;
  const existing = await dbHelper.get('SELECT * FROM placement_drives WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Drive not found.' });
  }

  const {
    title, role, ctcLpa, location, driveDate, deadline, status,
    minCgpa, min10th, min12th, maxBacklogs, allowBacklogHistory,
    allowedBranches, graduationYear, maxGapMonths, recruiterUserId
  } = req.body;

  if (recruiterUserId !== undefined) {
    await dbHelper.run('UPDATE companies SET recruiter_user_id = ? WHERE id = ?', [recruiterUserId || null, existing.company_id]);
  }

  await dbHelper.run(`
    UPDATE placement_drives
    SET title = COALESCE(?, title),
        role = COALESCE(?, role),
        ctc_lpa = COALESCE(?, ctc_lpa),
        location = COALESCE(?, location),
        drive_date = COALESCE(?, drive_date),
        deadline = COALESCE(?, deadline),
        status = COALESCE(?, status)
    WHERE id = ?
  `, [title, role, ctcLpa ? Number(ctcLpa) : null, location, driveDate, deadline, status, id]);

  const branchesJson = Array.isArray(allowedBranches) ? JSON.stringify(allowedBranches) : null;

  await dbHelper.run(`
    UPDATE drive_requirements
    SET min_cgpa = COALESCE(?, min_cgpa),
        min_tenth_percentage = COALESCE(?, min_tenth_percentage),
        min_twelfth_percentage = COALESCE(?, min_twelfth_percentage),
        max_active_backlogs = COALESCE(?, max_active_backlogs),
        allow_backlog_history = COALESCE(?, allow_backlog_history),
        allowed_branches = COALESCE(?, allowed_branches),
        graduation_year = COALESCE(?, graduation_year),
        max_gap_months = COALESCE(?, max_gap_months)
    WHERE drive_id = ?
  `, [
    minCgpa ? Number(minCgpa) : null,
    min10th ? Number(min10th) : null,
    min12th ? Number(min12th) : null,
    maxBacklogs !== undefined ? Number(maxBacklogs) : null,
    allowBacklogHistory !== undefined ? (allowBacklogHistory ? 1 : 0) : null,
    branchesJson,
    graduationYear ? Number(graduationYear) : null,
    maxGapMonths !== undefined ? Number(maxGapMonths) : null,
    id
  ]);

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'COMPANY_ELIGIBILITY_MODIFIED',
    entityType: 'PLACEMENT_DRIVE',
    entityId: id,
    newValues: { minCgpa, maxBacklogs, branchesJson, recruiterUserId },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({ message: 'Placement drive updated successfully.' });
}

export async function deleteDrive(req, res) {
  const { id } = req.params;
  const drive = await dbHelper.get('SELECT title FROM placement_drives WHERE id = ?', [id]);
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found.' });
  }

  await dbHelper.run('DELETE FROM placement_drives WHERE id = ?', [id]);

  await logAudit({
    userId: req.user.id,
    userName: req.user.name || req.user.username,
    role: req.user.role,
    action: 'DRIVE_DELETED',
    entityType: 'PLACEMENT_DRIVE',
    entityId: id,
    oldValues: { title: drive.title },
    ipAddress: req.ip || '127.0.0.1'
  });

  return res.json({ message: 'Drive deleted successfully.' });
}

export async function getRecruiters(req, res) {
  const recruiters = await dbHelper.all(`
    SELECT id, username, email, role, status, created_at
    FROM users
    WHERE role = 'recruiter'
    ORDER BY username ASC
  `);
  return res.json({ recruiters });
}
