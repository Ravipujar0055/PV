-- ============================================================================
-- VERIPLACE: Structured MySQL Relational Database Schema
-- Database: placement_verification
-- Engine: InnoDB with Foreign Keys, Constraints, and Indexing
-- ============================================================================

CREATE DATABASE IF NOT EXISTS placement_verification CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE placement_verification;

-- 1. Users Table (Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(191) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin', 'recruiter') NOT NULL,
  status ENUM('active', 'blocked') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Students Registry
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE NOT NULL,
  usn VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  mobile VARCHAR(20),
  gender VARCHAR(20),
  dob VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Certified Institutional Academic Records (SINGLE SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS academic_records (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) UNIQUE NOT NULL,
  usn VARCHAR(50) UNIQUE NOT NULL,
  tenth_percentage DECIMAL(5,2) NOT NULL,
  tenth_year INT NOT NULL,
  twelfth_percentage DECIMAL(5,2) NOT NULL,
  twelfth_year INT NOT NULL,
  degree VARCHAR(100) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  cgpa DECIMAL(4,2) NOT NULL,
  graduation_year INT NOT NULL,
  active_backlogs INT NOT NULL DEFAULT 0,
  backlog_history_count INT NOT NULL DEFAULT 0,
  education_gap TINYINT(1) DEFAULT 0,
  education_gap_months INT DEFAULT 0,
  work_experience_months INT DEFAULT 0,
  verification_status ENUM('VERIFIED', 'PENDING', 'FLAGGED') DEFAULT 'VERIFIED',
  verified_by VARCHAR(191) DEFAULT 'Institutional Academic Registry',
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_academic_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Companies
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  industry VARCHAR(191),
  website VARCHAR(255),
  recruiter_user_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_recruiter FOREIGN KEY (recruiter_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Placement Drives
CREATE TABLE IF NOT EXISTS placement_drives (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  title VARCHAR(191) NOT NULL,
  role VARCHAR(191) NOT NULL,
  ctc_lpa DECIMAL(6,2) NOT NULL,
  location VARCHAR(191) NOT NULL,
  drive_date VARCHAR(50) NOT NULL,
  deadline VARCHAR(50) NOT NULL,
  status ENUM('upcoming', 'active', 'closed') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drive_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Dynamic Drive Requirements
CREATE TABLE IF NOT EXISTS drive_requirements (
  id VARCHAR(36) PRIMARY KEY,
  drive_id VARCHAR(36) UNIQUE NOT NULL,
  min_cgpa DECIMAL(4,2) NOT NULL,
  min_tenth_percentage DECIMAL(5,2) NOT NULL,
  min_twelfth_percentage DECIMAL(5,2) NOT NULL,
  max_active_backlogs INT NOT NULL,
  allow_backlog_history TINYINT(1) NOT NULL DEFAULT 0,
  allowed_branches TEXT NOT NULL,
  graduation_year INT NOT NULL,
  max_gap_months INT DEFAULT 12,
  work_experience_required TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_req_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Placement Applications
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  drive_id VARCHAR(36) NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  eligibility_status VARCHAR(50) NOT NULL DEFAULT 'ELIGIBLE',
  eligibility_snapshot TEXT NOT NULL,
  application_status ENUM('applied', 'shortlisted', 'assessment', 'technical_interview', 'hr_interview', 'selected', 'rejected', 'withdrawn') DEFAULT 'applied',
  resume_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_drive (student_id, drive_id),
  CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Student Career Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) UNIQUE NOT NULL,
  resume_filename VARCHAR(255),
  resume_path VARCHAR(255),
  resume_url TEXT,
  projects TEXT,
  skills TEXT,
  certifications TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Fraud & Data Mismatches
CREATE TABLE IF NOT EXISTS data_mismatches (
  id VARCHAR(36) PRIMARY KEY,
  usn VARCHAR(50) NOT NULL,
  student_id VARCHAR(36),
  source VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  submitted_value VARCHAR(255) NOT NULL,
  verified_value VARCHAR(255) NOT NULL,
  severity ENUM('HIGH', 'MEDIUM', 'LOW') DEFAULT 'HIGH',
  status ENUM('pending_review', 'flagged', 'resolved', 'penalized') DEFAULT 'pending_review',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mismatch_usn (usn),
  INDEX idx_mismatch_status (status),
  CONSTRAINT fk_mismatch_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. Immutable Security Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  user_name VARCHAR(191),
  role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- 11. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  title VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'danger', 'success') DEFAULT 'info',
  read_status TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. External Google Forms Submissions (Reconciliation & Audit Trail)
CREATE TABLE IF NOT EXISTS external_form_submissions (
  id VARCHAR(36) PRIMARY KEY,
  usn VARCHAR(50) NOT NULL,
  student_name VARCHAR(191),
  submitted_cgpa DECIMAL(4,2),
  submitted_backlogs INT,
  submitted_branch VARCHAR(100),
  submitted_email VARCHAR(191),
  submitted_mobile VARCHAR(20),
  raw_payload TEXT,
  reconciliation_status ENUM('matched', 'mismatch_flagged', 'unregistered_student') DEFAULT 'matched',
  discrepancies_count INT DEFAULT 0,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ext_usn (usn)
) ENGINE=InnoDB;

-- ============================================================================
-- RELATIONAL VIEWS FOR EFFICIENT REPORTING & AUDITING
-- ============================================================================

CREATE OR REPLACE VIEW v_student_academic_summary AS
SELECT 
  s.id AS student_id,
  s.usn,
  s.name,
  s.email,
  s.mobile,
  u.status AS account_status,
  ar.degree,
  ar.branch,
  ar.cgpa,
  ar.tenth_percentage,
  ar.twelfth_percentage,
  ar.graduation_year,
  ar.active_backlogs,
  ar.backlog_history_count,
  ar.verification_status,
  (SELECT COUNT(*) FROM data_mismatches dm WHERE dm.usn = s.usn AND dm.status = 'flagged') AS active_fraud_flags,
  (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.id) AS total_applications
FROM students s
JOIN users u ON u.id = s.user_id
LEFT JOIN academic_records ar ON ar.student_id = s.id;

CREATE OR REPLACE VIEW v_drive_applicant_details AS
SELECT 
  a.id AS application_id,
  a.drive_id,
  d.title AS drive_title,
  d.role AS job_role,
  c.name AS company_name,
  s.id AS student_id,
  s.usn,
  s.name AS student_name,
  s.email AS student_email,
  ar.branch,
  ar.cgpa,
  ar.active_backlogs,
  a.eligibility_status,
  a.application_status,
  a.applied_at
FROM applications a
JOIN placement_drives d ON d.id = a.drive_id
JOIN companies c ON c.id = d.company_id
JOIN students s ON s.id = a.student_id
LEFT JOIN academic_records ar ON ar.student_id = s.id;
