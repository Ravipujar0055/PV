import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { uploadResume } from '../middleware/uploadMiddleware.js';

// Controllers
import * as authCtrl from '../controllers/authController.js';
import * as studentCtrl from '../controllers/studentController.js';
import * as companyCtrl from '../controllers/companyController.js';
import * as appCtrl from '../controllers/applicationController.js';
import * as mismatchCtrl from '../controllers/mismatchController.js';
import * as importCtrl from '../controllers/importController.js';
import * as statsCtrl from '../controllers/adminStatsController.js';
import * as studentsAdminCtrl from '../controllers/adminStudentsController.js';
import * as auditCtrl from '../controllers/auditController.js';

const router = express.Router();

// ==========================================
// 1. Authentication & Demo Switcher
// ==========================================
router.post('/auth/login', authCtrl.login);
router.get('/auth/demo-accounts', authCtrl.getDemoAccounts);
router.post('/auth/demo-login', authCtrl.demoLogin);
router.get('/auth/me', authenticateToken, authCtrl.getCurrentUser);
router.put('/auth/profile', authenticateToken, authCtrl.updateUserProfile);

// ==========================================
// 2. Student Portal Endpoints
// ==========================================
router.get('/students/me', authenticateToken, requireRole(['student']), studentCtrl.getMeProfile);
router.put('/students/me/profile', authenticateToken, requireRole(['student']), studentCtrl.updateStudentProfile);
router.put('/students/me/contact', authenticateToken, requireRole(['student']), studentCtrl.updateStudentContactInfo);
router.put('/students/me/resume-link', authenticateToken, requireRole(['student']), studentCtrl.updateResumeLink);
router.post('/students/me/resume', authenticateToken, requireRole(['student']), uploadResume.single('resume'), studentCtrl.uploadStudentResumeFile);
router.get('/students/me/applications', authenticateToken, requireRole(['student']), studentCtrl.getStudentApplicationsList);

// ==========================================
// 3. Companies & Placement Drives
// ==========================================
router.get('/companies', authenticateToken, companyCtrl.getAllDrives);
router.get('/companies/:id', authenticateToken, companyCtrl.getDriveById);
router.post('/companies/:driveId/apply', authenticateToken, requireRole(['student']), appCtrl.applyToDrive);

// ==========================================
// 4. Applications & Recruitment Stages
// ==========================================
router.get('/applications/drive/:driveId', authenticateToken, requireRole(['admin', 'recruiter']), appCtrl.getDriveApplications);
router.patch('/applications/:id/stage', authenticateToken, requireRole(['admin', 'recruiter']), appCtrl.updateApplicationStage);
router.post('/applications/:id/withdraw', authenticateToken, requireRole(['student']), appCtrl.withdrawApplication);

// ==========================================
// 5. Admin Portal Endpoints
// ==========================================
router.get('/admin/stats', authenticateToken, requireRole(['admin']), statsCtrl.getDashboardStats);
router.get('/admin/recruiters', authenticateToken, requireRole(['admin']), companyCtrl.getRecruiters);

// Drive Management
router.post('/admin/companies', authenticateToken, requireRole(['admin']), companyCtrl.createDrive);
router.put('/admin/companies/:id', authenticateToken, requireRole(['admin']), companyCtrl.updateDrive);
router.delete('/admin/companies/:id', authenticateToken, requireRole(['admin']), companyCtrl.deleteDrive);

// Student Master Management
router.get('/admin/students', authenticateToken, requireRole(['admin']), studentsAdminCtrl.getAllStudentsAdmin);
router.get('/admin/students/:usn', authenticateToken, requireRole(['admin']), studentsAdminCtrl.getStudentDetailsAdmin);
router.patch('/admin/students/:usn/verify', authenticateToken, requireRole(['admin']), mismatchCtrl.updateAcademicVerificationStatus);
router.patch('/admin/students/:usn/block', authenticateToken, requireRole(['admin']), mismatchCtrl.updateStudentBlockStatus);
router.put('/admin/students/:usn/record', authenticateToken, requireRole(['admin']), studentsAdminCtrl.editVerifiedRecordAdmin);

// Applications Grid
router.get('/admin/applications', authenticateToken, requireRole(['admin']), appCtrl.getAllApplicationsAdmin);

// Discrepancy / Mismatch Center
router.get('/admin/mismatches', authenticateToken, requireRole(['admin']), mismatchCtrl.getAllMismatches);
router.patch('/admin/mismatches/:id', authenticateToken, requireRole(['admin']), mismatchCtrl.resolveMismatch);

// Imports & Google Form Reconciliation
router.post('/admin/import/google-forms', authenticateToken, requireRole(['admin', 'student']), importCtrl.importGoogleFormData);
router.post('/admin/import/master-records', authenticateToken, requireRole(['admin']), importCtrl.importMasterAcademicRecords);

// Immutable Audit Trail
router.get('/admin/audit-logs', authenticateToken, requireRole(['admin']), auditCtrl.getLogs);

export default router;
