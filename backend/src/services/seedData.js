import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { dbHelper } from '../config/database.js';

export async function seedInitialData() {
  const userCount = await dbHelper.get('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial institutional data...');

  const saltRounds = 10;
  const adminHash = bcrypt.hashSync('Admin@123', saltRounds);
  const studentHash = bcrypt.hashSync('Student@123', saltRounds);
  const recruiterHash = bcrypt.hashSync('Recruiter@123', saltRounds);

  // 1. Create Users
  const adminId = crypto.randomUUID();
  await dbHelper.run(`
    INSERT INTO users (id, username, email, password_hash, role, status)
    VALUES (?, 'admin', 'admin@placement.edu', ?, 'admin', 'active')
  `, [adminId, adminHash]);

  const recruiterId = crypto.randomUUID();
  await dbHelper.run(`
    INSERT INTO users (id, username, email, password_hash, role, status)
    VALUES (?, 'recruiter_abc', 'recruiter@abc-tech.com', ?, 'recruiter', 'active')
  `, [recruiterId, recruiterHash]);

  // Seed Students
  const studentsData = [
    {
      usn: '1MS21CS001',
      name: 'Aarav Patel',
      email: 'aarav.patel@placement.edu',
      mobile: '9876543210',
      gender: 'Male',
      dob: '2003-05-14',
      tenth: 88.5,
      tenthYear: 2019,
      twelfth: 86.0,
      twelfthYear: 2021,
      degree: 'B.Tech',
      branch: 'CSE',
      cgpa: 8.65,
      gradYear: 2027,
      activeBacklogs: 0,
      backlogHistory: 0,
      gap: 0,
      gapMonths: 0,
      workExp: 0,
      status: 'VERIFIED',
      verifiedBy: 'Dr. K. Sharma (Registrar)',
      projects: [
        { title: 'Distributed Microservices Broker', tech: 'Go, Kafka, Docker', description: 'Built an event-driven message dispatching system processing 25k msgs/sec.' },
        { title: 'AI Placement Classifier', tech: 'Python, FastAPI, PyTorch', description: 'Deep learning model for resume-to-job matching with 91% precision.' }
      ],
      skills: ['React', 'Node.js', 'Python', 'Go', 'Docker', 'PostgreSQL', 'System Design'],
      certifications: ['AWS Certified Solutions Architect Associate', 'DeepLearning.AI TensorFlow Specialization']
    },
    {
      usn: '1MS21CS042',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@placement.edu',
      mobile: '9876543211',
      gender: 'Male',
      dob: '2003-08-22',
      tenth: 72.0,
      tenthYear: 2019,
      twelfth: 68.5,
      twelfthYear: 2021,
      degree: 'B.Tech',
      branch: 'CSE',
      cgpa: 6.80, // CRITICAL: Verified 6.80 (Attempted fake 8.20 scenario)
      gradYear: 2027,
      activeBacklogs: 1, // 1 active backlog
      backlogHistory: 2,
      gap: 0,
      gapMonths: 0,
      workExp: 0,
      status: 'VERIFIED',
      verifiedBy: 'Dr. K. Sharma (Registrar)',
      projects: [
        { title: 'Campus Event Portal', tech: 'HTML, CSS, Node.js', description: 'Portal for university club event bookings and ticketing.' }
      ],
      skills: ['HTML5', 'CSS3', 'JavaScript', 'C++', 'SQL'],
      certifications: ['Responsive Web Design Certification']
    },
    {
      usn: '1MS21EC015',
      name: 'Priya Rao',
      email: 'priya.rao@placement.edu',
      mobile: '9876543212',
      gender: 'Female',
      dob: '2003-11-09',
      tenth: 82.0,
      tenthYear: 2019,
      twelfth: 79.5,
      twelfthYear: 2021,
      degree: 'B.Tech',
      branch: 'ECE',
      cgpa: 7.40,
      gradYear: 2027,
      activeBacklogs: 0,
      backlogHistory: 0,
      gap: 0,
      gapMonths: 0,
      workExp: 0,
      status: 'VERIFIED',
      verifiedBy: 'Dr. K. Sharma (Registrar)',
      projects: [
        { title: 'Smart Agriculture IoT Node', tech: 'ESP32, MQTT, C++', description: 'LoRaWAN connected soil telemetry and automated micro-irrigation controller.' }
      ],
      skills: ['Embedded C', 'MATLAB', 'Python', 'Verilog', 'PCB CAD'],
      certifications: ['Arm Cortex-M Architecture', 'Cisco IoT Fundamentals']
    },
    {
      usn: '1MS21ME033',
      name: 'Vikram Verma',
      email: 'vikram.verma@placement.edu',
      mobile: '9876543213',
      gender: 'Male',
      dob: '2002-12-03',
      tenth: 76.5,
      tenthYear: 2019,
      twelfth: 74.0,
      twelfthYear: 2021,
      degree: 'B.Tech',
      branch: 'MECH',
      cgpa: 7.85,
      gradYear: 2027,
      activeBacklogs: 0,
      backlogHistory: 0,
      gap: 0,
      gapMonths: 0,
      workExp: 0,
      status: 'VERIFIED',
      verifiedBy: 'Dr. K. Sharma (Registrar)',
      projects: [
        { title: 'Finite Element Analysis of Suspension Arms', tech: 'ANSYS, SolidWorks', description: 'Topology optimization reducing mass by 18%.' }
      ],
      skills: ['SolidWorks', 'ANSYS', 'AutoCAD', 'Python', 'MATLAB'],
      certifications: ['Certified SolidWorks Associate (CSWA)']
    },
    {
      usn: '1MS21IS022',
      name: 'Sneha Roy',
      email: 'sneha.roy@placement.edu',
      mobile: '9876543214',
      gender: 'Female',
      dob: '2003-03-18',
      tenth: 71.0,
      tenthYear: 2019,
      twelfth: 69.5,
      twelfthYear: 2021,
      degree: 'B.Tech',
      branch: 'ISE',
      cgpa: 6.90,
      gradYear: 2027,
      activeBacklogs: 2,
      backlogHistory: 2,
      gap: 0,
      gapMonths: 0,
      workExp: 0,
      status: 'FLAGGED', // Already flagged for discrepancy
      verifiedBy: 'Dr. K. Sharma (Registrar)',
      projects: [
        { title: 'Personal Blog CMS', tech: 'React, Firebase', description: 'Markdown blog platform with OAuth integration.' }
      ],
      skills: ['React', 'JavaScript', 'HTML/CSS', 'Git'],
      certifications: ['Frontend Web Development']
    }
  ];

  const studentIdMap = {};

  for (const s of studentsData) {
    const userId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    studentIdMap[s.usn] = studentId;

    // Insert user
    await dbHelper.run(`
      INSERT INTO users (id, username, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'student', 'active')
    `, [userId, s.usn.toLowerCase(), s.email, studentHash]);

    // Insert student
    await dbHelper.run(`
      INSERT INTO students (id, user_id, usn, name, email, mobile, gender, dob)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [studentId, userId, s.usn, s.name, s.email, s.mobile, s.gender, s.dob]);

    // Insert verified academic record
    await dbHelper.run(`
      INSERT INTO academic_records (
        id, student_id, usn, tenth_percentage, tenth_year, twelfth_percentage, twelfth_year,
        degree, branch, cgpa, graduation_year, active_backlogs, backlog_history_count,
        education_gap, education_gap_months, work_experience_months, verification_status,
        verified_by, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      crypto.randomUUID(), studentId, s.usn, s.tenth, s.tenthYear, s.twelfth, s.twelfthYear,
      s.degree, s.branch, s.cgpa, s.gradYear, s.activeBacklogs, s.backlogHistory,
      s.gap, s.gapMonths, s.workExp, s.status, s.verifiedBy
    ]);

    // Insert student profile
    await dbHelper.run(`
      INSERT INTO student_profiles (id, student_id, resume_filename, resume_path, projects, skills, certifications)
      VALUES (?, ?, 'sample_resume.pdf', '/uploads/sample_resume.pdf', ?, ?, ?)
    `, [
      crypto.randomUUID(),
      studentId,
      JSON.stringify(s.projects),
      JSON.stringify(s.skills),
      JSON.stringify(s.certifications)
    ]);
  }

  // 2. Seed Companies & Placement Drives
  const companies = [
    {
      id: crypto.randomUUID(),
      name: 'ABC Technologies',
      industry: 'Software & Enterprise Cloud',
      website: 'https://abctechnologies.example.com',
      recruiterUserId: recruiterId,
      drives: [
        {
          id: crypto.randomUUID(),
          title: 'Software Development Engineer - I (SDE)',
          role: 'Full Stack / Backend Engineer',
          ctc: 12.5,
          location: 'Bangalore / Remote',
          driveDate: '2026-09-25',
          deadline: '2026-09-20',
          status: 'active',
          requirements: {
            minCgpa: 7.50,
            min10th: 65.0,
            min12th: 65.0,
            maxBacklogs: 0,
            allowHistory: 0, // No backlog history
            branches: ['CSE', 'ISE', 'ECE'],
            gradYear: 2027,
            maxGap: 12,
            workExp: 0
          }
        }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'XYZ Global Cloud',
      industry: 'Cloud Infrastructure & DevOps',
      website: 'https://xyzcloud.example.com',
      recruiterUserId: null,
      drives: [
        {
          id: crypto.randomUUID(),
          title: 'Cloud DevOps Associate',
          role: 'DevOps & Site Reliability',
          ctc: 9.0,
          location: 'Hyderabad',
          driveDate: '2026-10-02',
          deadline: '2026-09-28',
          status: 'active',
          requirements: {
            minCgpa: 7.00,
            min10th: 60.0,
            min12th: 60.0,
            maxBacklogs: 0,
            allowHistory: 1, // History permitted if cleared
            branches: ['CSE', 'ISE', 'ECE', 'MECH'],
            gradYear: 2027,
            maxGap: 24,
            workExp: 0
          }
        }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'FinTech Innovations',
      industry: 'Algorithmic Trading & Finance',
      website: 'https://fintechinnovations.example.com',
      recruiterUserId: null,
      drives: [
        {
          id: crypto.randomUUID(),
          title: 'High Frequency Systems Developer',
          role: 'C++ Systems Engineer',
          ctc: 18.0,
          location: 'Mumbai',
          driveDate: '2026-10-10',
          deadline: '2026-10-05',
          status: 'active',
          requirements: {
            minCgpa: 8.00,
            min10th: 75.0,
            min12th: 75.0,
            maxBacklogs: 0,
            allowHistory: 0,
            branches: ['CSE', 'ISE'],
            gradYear: 2027,
            maxGap: 6,
            workExp: 0
          }
        }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'NextGen Analytics',
      industry: 'Data Intelligence',
      website: 'https://nextgenanalytics.example.com',
      recruiterUserId: null,
      drives: [
        {
          id: crypto.randomUUID(),
          title: 'Junior Data Analyst',
          role: 'BI & Data Pipeline Specialist',
          ctc: 6.5,
          location: 'Pune / Hybrid',
          driveDate: '2026-10-18',
          deadline: '2026-10-12',
          status: 'active',
          requirements: {
            minCgpa: 6.50,
            min10th: 55.0,
            min12th: 55.0,
            maxBacklogs: 1, // 1 backlog allowed
            allowHistory: 1,
            branches: ['CSE', 'ISE', 'ECE', 'MECH', 'CIVIL'],
            gradYear: 2027,
            maxGap: 24,
            workExp: 0
          }
        }
      ]
    }
  ];

  const driveIdMap = {};

  for (const c of companies) {
    await dbHelper.run(`
      INSERT INTO companies (id, name, industry, website, recruiter_user_id)
      VALUES (?, ?, ?, ?, ?)
    `, [c.id, c.name, c.industry, c.website, c.recruiterUserId]);

    for (const d of c.drives) {
      driveIdMap[d.title] = d.id;

      await dbHelper.run(`
        INSERT INTO placement_drives (id, company_id, title, role, ctc_lpa, location, drive_date, deadline, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [d.id, c.id, d.title, d.role, d.ctc, d.location, d.driveDate, d.deadline, d.status]);

      await dbHelper.run(`
        INSERT INTO drive_requirements (
          id, drive_id, min_cgpa, min_tenth_percentage, min_twelfth_percentage,
          max_active_backlogs, allow_backlog_history, allowed_branches,
          graduation_year, max_gap_months, work_experience_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(),
        d.id,
        d.requirements.minCgpa,
        d.requirements.min10th,
        d.requirements.min12th,
        d.requirements.maxBacklogs,
        d.requirements.allowHistory,
        JSON.stringify(d.requirements.branches),
        d.requirements.gradYear,
        d.requirements.maxGap,
        d.requirements.workExp
      ]);
    }
  }

  // 3. Seed Sample Applications
  const sdeDriveId = driveIdMap['Software Development Engineer - I (SDE)'];
  const cloudDriveId = driveIdMap['Cloud DevOps Associate'];

  if (sdeDriveId && studentIdMap['1MS21CS001']) {
    await dbHelper.run(`
      INSERT INTO applications (id, student_id, drive_id, eligibility_status, eligibility_snapshot, application_status, resume_url)
      VALUES (?, ?, ?, 'ELIGIBLE', '{"cgpa":8.65,"passed":true}', 'shortlisted', '/uploads/sample_resume.pdf')
    `, [crypto.randomUUID(), studentIdMap['1MS21CS001'], sdeDriveId]);
  }

  if (cloudDriveId && studentIdMap['1MS21EC015']) {
    await dbHelper.run(`
      INSERT INTO applications (id, student_id, drive_id, eligibility_status, eligibility_snapshot, application_status, resume_url)
      VALUES (?, ?, ?, 'ELIGIBLE', '{"cgpa":7.40,"passed":true}', 'applied', '/uploads/sample_resume.pdf')
    `, [crypto.randomUUID(), studentIdMap['1MS21EC015'], cloudDriveId]);
  }

  // 4. Seed Pre-Existing Discrepancy for Sneha Roy (1MS21IS022)
  if (studentIdMap['1MS21IS022']) {
    await dbHelper.run(`
      INSERT INTO data_mismatches (id, usn, student_id, source, field_name, submitted_value, verified_value, severity, status, notes)
      VALUES (?, '1MS21IS022', ?, 'google_form', 'CGPA', '8.20', '6.90', 'HIGH', 'flagged', 'Inflated CGPA by +1.30 via Google Form batch 2026-A')
    `, [crypto.randomUUID(), studentIdMap['1MS21IS022']]);

    await dbHelper.run(`
      INSERT INTO data_mismatches (id, usn, student_id, source, field_name, submitted_value, verified_value, severity, status, notes)
      VALUES (?, '1MS21IS022', ?, 'google_form', 'Active Backlogs', '0', '2', 'HIGH', 'flagged', 'Concealed 2 active backlogs in form submission')
    `, [crypto.randomUUID(), studentIdMap['1MS21IS022']]);
  }

  // 5. Seed Audit Logs
  await dbHelper.run(`
    INSERT INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, new_values, ip_address)
    VALUES (?, ?, 'System Registrar', 'admin', 'SYSTEM_INITIALIZED', 'SYSTEM', 'ROOT', '{"status":"INSTITUTIONAL_MASTER_VERIFIED"}', '127.0.0.1')
  `, [crypto.randomUUID(), adminId]);

  await dbHelper.run(`
    INSERT INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, new_values, ip_address)
    VALUES (?, ?, 'System Registrar', 'admin', 'DATA_MISMATCH_DETECTED', 'ACADEMIC_RECORD', '1MS21IS022', '{"field":"CGPA","submitted":"8.20","verified":"6.90"}', '127.0.0.1')
  `, [crypto.randomUUID(), adminId]);

  console.log('Institutional seed data successfully created.');
}
