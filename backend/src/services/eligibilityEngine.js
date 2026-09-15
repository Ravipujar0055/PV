/**
 * Deterministic Eligibility Engine
 * Evaluates verified institutional academic record against dynamic company requirements.
 * STUDENT-SUBMITTED DATA IS NEVER USED HERE.
 */
export function checkEligibility(verifiedRecord, requirements) {
  if (!verifiedRecord || !requirements) {
    return {
      isEligible: false,
      checks: [],
      failedReasons: ['Missing academic record or company requirements data.'],
      summary: 'Data unavailable'
    };
  }

  // Parse allowed branches if stored as JSON string
  let allowedBranches = [];
  try {
    allowedBranches = typeof requirements.allowed_branches === 'string'
      ? JSON.parse(requirements.allowed_branches)
      : requirements.allowed_branches || [];
  } catch {
    allowedBranches = [];
  }

  const checks = [];
  const failedReasons = [];

  // 1. CGPA Check
  const cgpaPassed = Number(verifiedRecord.cgpa) >= Number(requirements.min_cgpa);
  checks.push({
    field: 'cgpa',
    label: 'College CGPA',
    required: `>= ${Number(requirements.min_cgpa).toFixed(2)}`,
    actual: Number(verifiedRecord.cgpa).toFixed(2),
    passed: cgpaPassed,
    unit: 'CGPA'
  });
  if (!cgpaPassed) {
    failedReasons.push(`CGPA is ${Number(verifiedRecord.cgpa).toFixed(2)}, but minimum required is ${Number(requirements.min_cgpa).toFixed(2)}`);
  }

  // 2. 10th Percentage Check
  const tenthPassed = Number(verifiedRecord.tenth_percentage) >= Number(requirements.min_tenth_percentage);
  checks.push({
    field: 'tenth_percentage',
    label: '10th Standard',
    required: `>= ${Number(requirements.min_tenth_percentage).toFixed(1)}%`,
    actual: `${Number(verifiedRecord.tenth_percentage).toFixed(1)}%`,
    passed: tenthPassed,
    unit: '%'
  });
  if (!tenthPassed) {
    failedReasons.push(`10th marks are ${Number(verifiedRecord.tenth_percentage).toFixed(1)}%, but minimum required is ${Number(requirements.min_tenth_percentage).toFixed(1)}%`);
  }

  // 3. 12th Percentage Check
  const twelfthPassed = Number(verifiedRecord.twelfth_percentage) >= Number(requirements.min_twelfth_percentage);
  checks.push({
    field: 'twelfth_percentage',
    label: '12th / Diploma',
    required: `>= ${Number(requirements.min_twelfth_percentage).toFixed(1)}%`,
    actual: `${Number(verifiedRecord.twelfth_percentage).toFixed(1)}%`,
    passed: twelfthPassed,
    unit: '%'
  });
  if (!twelfthPassed) {
    failedReasons.push(`12th/Diploma marks are ${Number(verifiedRecord.twelfth_percentage).toFixed(1)}%, but minimum required is ${Number(requirements.min_twelfth_percentage).toFixed(1)}%`);
  }

  // 4. Active Backlogs Check
  const activeBacklogs = Number(verifiedRecord.active_backlogs || 0);
  const maxActiveBacklogs = Number(requirements.max_active_backlogs || 0);
  const backlogsPassed = activeBacklogs <= maxActiveBacklogs;
  checks.push({
    field: 'active_backlogs',
    label: 'Active Backlogs',
    required: `<= ${maxActiveBacklogs}`,
    actual: `${activeBacklogs}`,
    passed: backlogsPassed,
    unit: 'backlogs'
  });
  if (!backlogsPassed) {
    failedReasons.push(`Active backlogs: ${activeBacklogs}, company allows maximum of ${maxActiveBacklogs}`);
  }

  // 5. Backlog History Allowed Check
  const historyCount = Number(verifiedRecord.backlog_history_count || 0);
  const historyAllowed = Boolean(requirements.allow_backlog_history);
  const backlogHistoryPassed = historyAllowed || historyCount === 0;
  checks.push({
    field: 'backlog_history',
    label: 'Backlog History',
    required: historyAllowed ? 'Allowed' : 'Strictly 0 (No past backlogs)',
    actual: historyCount === 0 ? 'No history (0)' : `${historyCount} past backlog(s)`,
    passed: backlogHistoryPassed,
    unit: ''
  });
  if (!backlogHistoryPassed) {
    failedReasons.push(`Student has ${historyCount} past backlog(s), but company strictly disallows backlog history`);
  }

  // 6. Branch / Discipline Check
  const studentBranch = (verifiedRecord.branch || '').toUpperCase().trim();
  const normalizedAllowedBranches = allowedBranches.map(b => b.toUpperCase().trim());
  const branchPassed = normalizedAllowedBranches.length === 0 || normalizedAllowedBranches.includes(studentBranch);
  checks.push({
    field: 'branch',
    label: 'Eligible Branch',
    required: normalizedAllowedBranches.length > 0 ? normalizedAllowedBranches.join(', ') : 'All Branches',
    actual: studentBranch,
    passed: branchPassed,
    unit: ''
  });
  if (!branchPassed) {
    failedReasons.push(`Branch '${studentBranch}' is not in eligible branches (${normalizedAllowedBranches.join(', ')})`);
  }

  // 7. Graduation Year Check
  const gradYearPassed = Number(verifiedRecord.graduation_year) === Number(requirements.graduation_year);
  checks.push({
    field: 'graduation_year',
    label: 'Graduation Batch',
    required: `${requirements.graduation_year}`,
    actual: `${verifiedRecord.graduation_year}`,
    passed: gradYearPassed,
    unit: 'Batch'
  });
  if (!gradYearPassed) {
    failedReasons.push(`Graduation year is ${verifiedRecord.graduation_year}, company requires batch ${requirements.graduation_year}`);
  }

  // 8. Max Education Gap Check
  const gapMonths = Number(verifiedRecord.education_gap_months || 0);
  const maxGap = Number(requirements.max_gap_months ?? 12);
  const gapPassed = gapMonths <= maxGap;
  checks.push({
    field: 'education_gap',
    label: 'Education Gap',
    required: `<= ${maxGap} months`,
    actual: `${gapMonths} months`,
    passed: gapPassed,
    unit: 'months'
  });
  if (!gapPassed) {
    failedReasons.push(`Education gap is ${gapMonths} months, exceeding allowed limit of ${maxGap} months`);
  }

  // 9. Work Experience Requirement Check
  const workMonths = Number(verifiedRecord.work_experience_months || 0);
  const workRequired = Boolean(requirements.work_experience_required);
  const workPassed = !workRequired || workMonths > 0;
  checks.push({
    field: 'work_experience',
    label: 'Work Experience',
    required: workRequired ? 'Mandatory' : 'Optional',
    actual: `${workMonths} months`,
    passed: workPassed,
    unit: ''
  });
  if (!workPassed) {
    failedReasons.push('Company requires prior work experience, but student has 0 months');
  }

  const isEligible = failedReasons.length === 0;

  return {
    isEligible,
    checks,
    failedReasons,
    passedCount: checks.filter(c => c.passed).length,
    totalCount: checks.length,
    summary: isEligible
      ? 'All institutional academic criteria satisfied'
      : `${failedReasons.length} criterion/criteria not met`
  };
}
