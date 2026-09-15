import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { 
  Users, Building, FileText, CheckCircle2, 
  ShieldAlert, Award, ArrowUpRight, UserX,
  Download, Filter, Search, ExternalLink, FileSpreadsheet, Copy
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Company Candidate Export States
  const [exportDriveId, setExportDriveId] = useState('');
  const [exportStage, setExportStage] = useState('all');
  const [exportBranch, setExportBranch] = useState('all');
  const [exportMinCgpa, setExportMinCgpa] = useState('all');
  const [exportSearch, setExportSearch] = useState('');
  const [driveApplicants, setDriveApplicants] = useState([]);
  const [loadingExport, setLoadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await api.getAdminStats();
        setData(res);
        if (res?.drives?.length > 0) {
          setExportDriveId(res.drives[0].id);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    if (!exportDriveId) return;

    async function loadDriveApplicants() {
      try {
        setLoadingExport(true);
        const res = await api.getAllApplicationsAdmin(`driveId=${exportDriveId}`);
        setDriveApplicants(res.applications || []);
      } catch (err) {
        console.error('Failed to load candidates for export', err);
      } finally {
        setLoadingExport(false);
      }
    }
    loadDriveApplicants();
  }, [exportDriveId]);

  const stats = data?.stats || {};
  const recentMismatches = data?.recentMismatches || [];
  const drives = data?.drives || [];

  // Filter candidates for the selected company
  const filteredExportApplicants = driveApplicants.filter(app => {
    if (exportStage !== 'all' && app.application_status !== exportStage) return false;
    if (exportBranch !== 'all' && (app.verified_branch || '').toUpperCase() !== exportBranch.toUpperCase()) return false;
    if (exportMinCgpa !== 'all' && Number(app.verified_cgpa || 0) < Number(exportMinCgpa)) return false;
    if (exportSearch.trim()) {
      const q = exportSearch.toLowerCase().trim();
      const usnMatch = (app.usn || '').toLowerCase().includes(q);
      const nameMatch = (app.student_name || '').toLowerCase().includes(q);
      if (!usnMatch && !nameMatch) return false;
    }
    return true;
  });

  const availableBranches = Array.from(new Set(driveApplicants.map(a => a.verified_branch).filter(Boolean))).sort();

  const handleDownloadCompanyExcel = async (customDriveId, customCompanyName, customRoleTitle) => {
    try {
      let listToExport = filteredExportApplicants;
      let targetCompany = customCompanyName;
      let targetRole = customRoleTitle;

      if (customDriveId && customDriveId !== exportDriveId) {
        const res = await api.getAllApplicationsAdmin(`driveId=${customDriveId}`);
        listToExport = res.applications || [];
      } else if (!customDriveId) {
        const cur = drives.find(d => d.id === exportDriveId);
        targetCompany = cur?.company_name || 'Company';
        targetRole = cur?.title || 'Drive';
      }

      if (!listToExport || listToExport.length === 0) {
        alert(`No candidates found for ${targetCompany || 'the selected company'} matching the filter.`);
        return;
      }

      const exportData = listToExport.map((app, index) => {
        let resumeLink = 'Not Provided';
        if (app.resume_url) {
          resumeLink = app.resume_url.startsWith('http') ? app.resume_url : `${window.location.origin}${app.resume_url}`;
        }

        return {
          'Sl No': index + 1,
          'Candidate USN': app.usn,
          'Candidate Name': app.student_name,
          'Email Address': app.student_email,
          'Mobile Number': app.student_mobile || 'N/A',
          'Company': targetCompany || app.company_name || 'N/A',
          'Role Title': targetRole || app.job_role || 'N/A',
          'Package (CTC)': app.ctc_lpa ? `₹${app.ctc_lpa} LPA` : 'N/A',
          'Degree Branch': app.verified_branch,
          'Certified CGPA': Number(app.verified_cgpa || 0).toFixed(2),
          '10th Marks (%)': app.tenth_percentage ? `${Number(app.tenth_percentage).toFixed(1)}%` : 'N/A',
          '12th Marks (%)': app.twelfth_percentage ? `${Number(app.twelfth_percentage).toFixed(1)}%` : 'N/A',
          'Active Backlogs': app.active_backlogs ?? 0,
          'Verification Status': app.verification_status || 'VERIFIED',
          'Current Stage': app.application_status ? app.application_status.toUpperCase().replace('_', ' ') : 'APPLIED',
          'Applied Date': app.applied_at ? app.applied_at.split(' ')[0] : 'N/A',
          'Public Resume Drive Link': resumeLink
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 24 },
        { wch: 28 },
        { wch: 15 },
        { wch: 22 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 48 }
      ];

      const workbook = XLSX.utils.book_new();
      const cleanCompany = (targetCompany || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanRole = (targetRole || 'Drive').replace(/[^a-zA-Z0-9_-]/g, '_');
      const sheetName = (cleanCompany).slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const filterSuffix = exportStage !== 'all' ? `_${exportStage.toUpperCase()}` : '';
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `${cleanCompany}_${cleanRole}_Candidate_Roster_For_Students${filterSuffix}_${dateStr}.xlsx`);
      setExportMessage({ type: 'success', text: `Downloaded candidate roster for ${targetCompany} (${listToExport.length} candidates). Ready to share with students.` });
    } catch (err) {
      console.error(err);
      alert('Failed to generate Excel file: ' + err.message);
    }
  };

  const handleCopyStudentAnnouncement = () => {
    if (filteredExportApplicants.length === 0) {
      alert('No candidates found matching the active filter to generate an announcement.');
      return;
    }

    const cur = drives.find(d => d.id === exportDriveId);
    const company = cur?.company_name || 'Placement Partner';
    const role = cur?.title || 'Campus Drive';
    const ctc = cur?.ctc_lpa ? `₹${cur.ctc_lpa} LPA` : '';
    const stageLabel = exportStage === 'all' ? 'All Applicants' : (stages.find(s => s.key === exportStage)?.label || exportStage);

    let text = `📢 CAMPUS PLACEMENT ANNOUNCEMENT — ${company.toUpperCase()}\n`;
    text += `Role: ${role} ${ctc ? `(${ctc})` : ''}\n`;
    text += `Recruitment Round / Stage: ${stageLabel.toUpperCase()}\n`;
    text += `Total Students Shortlisted: ${filteredExportApplicants.length}\n\n`;
    text += `Candidate Roster:\n`;

    filteredExportApplicants.forEach((s, idx) => {
      text += `${idx + 1}. ${s.usn} — ${s.student_name} (${s.verified_branch}) — CGPA: ${Number(s.verified_cgpa || 0).toFixed(2)}\n`;
    });

    text += `\nCandidates are advised to log in to their Student Placement Dashboard to track interview timelines and submission instructions.\n— Institutional Placement Cell`;

    navigator.clipboard.writeText(text).then(() => {
      setExportMessage({
        type: 'success',
        text: `Copied student shortlist announcement to clipboard (${filteredExportApplicants.length} students). Ready to share on WhatsApp, Telegram, or Email!`
      });
    }).catch(err => {
      console.error(err);
      alert('Could not copy to clipboard automatically.');
    });
  };

  const handleAdminStageChange = async (appId, newStage, candidateName = '') => {
    try {
      await api.updateApplicationStage(appId, newStage);
      setDriveApplicants(prev => prev.map(a => a.id === appId ? { ...a, application_status: newStage } : a));
      setExportMessage({ type: 'success', text: `Updated ${candidateName || 'candidate'} recruitment stage to '${newStage}'.` });
      // Refresh stats
      api.getAdminStats().then(setData).catch(console.error);
    } catch (err) {
      alert(err.data?.error || err.message || 'Failed to update recruitment stage');
    }
  };

  const stages = [
    { key: 'applied', label: 'Applied', badgeClass: 'badge-stage-applied' },
    { key: 'shortlisted', label: 'Shortlisted', badgeClass: 'badge-stage-shortlisted' },
    { key: 'assessment', label: 'Assessment', badgeClass: 'badge-stage-assessment' },
    { key: 'technical_interview', label: 'Tech Interview', badgeClass: 'badge-stage-technical' },
    { key: 'hr_interview', label: 'HR Round', badgeClass: 'badge-stage-hr' },
    { key: 'selected', label: 'Selected / Offer', badgeClass: 'badge-stage-selected' },
    { key: 'rejected', label: 'Rejected', badgeClass: 'badge-stage-rejected' },
    { key: 'withdrawn', label: 'Withdrawn', badgeClass: 'badge-stage-withdrawn' }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
        <div style={{
          display: 'inline-block',
          width: '36px',
          height: '36px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <div style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.4rem' }}>
          Loading Institutional Placement Dashboard...
        </div>
        <div style={{ fontSize: '0.85rem' }}>
          Synchronizing institutional verification stats, discrepancy records, and placement drives.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>Institutional Placement Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time monitoring of institutional academic records, eligibility verification, and student discrepancy flags.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('mismatches')}>
            <ShieldAlert size={16} color="#f87171" />
            <span>Fraud Alerts ({stats.totalMismatches || 0})</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('companies')}>
            <Building size={16} />
            <span>Manage Drives</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalStudents || 0}</div>
            <div className="stat-label">Enrolled Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Building size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalCompanies || 0}</div>
            <div className="stat-label">Active Companies</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalApplications || 0}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.eligibleApplications || 0}</div>
            <div className="stat-label">Eligible Applications</div>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#f87171' }}>{stats.totalMismatches || 0}</div>
            <div className="stat-label">Detected Mismatches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <UserX size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.flaggedStudents || 0}</div>
            <div className="stat-label">Flagged Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <Award size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.selectedStudents || 0}</div>
            <div className="stat-label">Offers / Placed</div>
          </div>
        </div>
      </div>

      {/* RECENT ACADEMIC DATA MISMATCHES ALERT SECTION */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <ShieldAlert size={20} color="#ef4444" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>High-Priority Academic Data Mismatches</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cross-referenced discrepancies between student form entries and verified institutional registrar records.
              </div>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={() => onNavigate('mismatches')} style={{ fontSize: '0.8rem' }}>
            Open Discrepancy Center <ArrowUpRight size={14} />
          </button>
        </div>

        {recentMismatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No unresolved academic discrepancies recorded.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student USN</th>
                  <th>Student Name</th>
                  <th>Mismatched Field</th>
                  <th>Student Submitted</th>
                  <th>Verified Master DB</th>
                  <th>Discrepancy Source</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentMismatches.map((m, idx) => (
                  <tr key={idx}>
                    <td><strong style={{ color: '#ffffff' }}>{m.usn}</strong></td>
                    <td>{m.student_name || 'Student'}</td>
                    <td style={{ fontWeight: 600 }}>{m.field_name}</td>
                    <td style={{ color: '#f87171', fontWeight: 700 }}>{m.submitted_value}</td>
                    <td style={{ color: '#34d399', fontWeight: 700 }}>{m.verified_value}</td>
                    <td style={{ textTransform: 'capitalize' }}>{m.source.replace('_', ' ')}</td>
                    <td>
                      <span className={`badge ${m.severity === 'HIGH' ? 'badge-flagged' : 'badge-pending'}`}>
                        {m.severity}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#312e81', color: '#c7d2fe' }}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPCOMING & ACTIVE PLACEMENT DRIVES */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Active & Upcoming Placement Drives</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Currently open for campus registration</div>
          </div>
          <button className="btn btn-secondary" onClick={() => onNavigate('companies')} style={{ fontSize: '0.8rem' }}>
            View All Drives <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role Title</th>
                <th>Package (CTC)</th>
                <th>Drive Date</th>
                <th>Deadline</th>
                <th>Applicants</th>
                <th>Status</th>
                <th>Candidate Excel Export</th>
              </tr>
            </thead>
            <tbody>
              {drives.map(d => (
                <tr key={d.id}>
                  <td><strong style={{ color: '#ffffff' }}>{d.company_name}</strong></td>
                  <td>{d.title}</td>
                  <td style={{ color: '#34d399', fontWeight: 700 }}>₹{d.ctc_lpa} LPA</td>
                  <td>{d.drive_date}</td>
                  <td>{d.deadline}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                      {d.applicant_count || 0} applied
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-verified">Active</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleDownloadCompanyExcel(d.id, d.company_name, d.title)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Download full candidate list in Excel (.xlsx)"
                      >
                        <Download size={13} /> Excel
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setExportDriveId(d.id);
                          const el = document.getElementById('company-export-center');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Filter and customize Excel export for this company"
                      >
                        <Filter size={13} /> Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPANY CANDIDATE FILTER & EXCEL EXPORT CENTER */}
      <div id="company-export-center" className="card" style={{ marginTop: '2rem', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              <FileSpreadsheet size={22} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                Company Candidate Export & Filter Center
              </h2>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Filter candidates by company drive and recruitment stage, download formatted Excel rosters for students, or copy announcement notices for WhatsApp/Email distribution.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleCopyStudentAnnouncement}
              disabled={filteredExportApplicants.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.825rem' }}
              title="Copy formatted announcement text to clipboard ready to share on WhatsApp or Email"
            >
              <Copy size={15} /> Copy Notice for Students
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => handleDownloadCompanyExcel()}
              disabled={filteredExportApplicants.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              title="Download official candidate roster in Excel (.xlsx) format"
            >
              <Download size={16} /> Download Excel ({filteredExportApplicants.length})
            </button>
          </div>
        </div>

        {exportMessage && (
          <div style={{
            padding: '0.85rem 1rem',
            margin: '1rem 0',
            borderRadius: 'var(--radius-md)',
            background: 'var(--success-bg)',
            color: '#34d399',
            border: '1px solid var(--success-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>{exportMessage.text}</span>
            </div>
            <button onClick={() => setExportMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
          </div>
        )}

        {/* Mini Stage Funnel for Selected Company */}
        <div style={{ margin: '1rem 0 0.5rem', display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
          <button
            onClick={() => setExportStage('all')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: exportStage === 'all' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: exportStage === 'all' ? '#ffffff' : 'var(--text-muted)',
              border: exportStage === 'all' ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            All Candidates ({driveApplicants.length})
          </button>
          {stages.map(s => {
            const count = driveApplicants.filter(a => a.application_status === s.key).length;
            const isAct = exportStage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setExportStage(s.key)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isAct ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: isAct ? '#a5b4fc' : 'var(--text-muted)',
                  border: isAct ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Filter Controls Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', 
          gap: '0.85rem', 
          margin: '0.85rem 0 1.25rem',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '1.1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* Select Company / Placement Drive */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem', display: 'block' }}>
              Target Company Drive:
            </label>
            <select 
              className="form-select"
              value={exportDriveId}
              onChange={e => setExportDriveId(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {drives.map(d => (
                <option key={d.id} value={d.id}>
                  {d.company_name} — {d.title} ({d.applicant_count || 0} applied)
                </option>
              ))}
            </select>
          </div>

          {/* Recruitment Stage Filter */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem', display: 'block' }}>
              Recruitment Stage:
            </label>
            <select 
              className="form-select"
              value={exportStage}
              onChange={e => setExportStage(e.target.value)}
            >
              <option value="all">All Stages ({driveApplicants.length})</option>
              {stages.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem', display: 'block' }}>
              Academic Branch:
            </label>
            <select 
              className="form-select"
              value={exportBranch}
              onChange={e => setExportBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              {availableBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Minimum CGPA Filter */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem', display: 'block' }}>
              Minimum CGPA:
            </label>
            <select 
              className="form-select"
              value={exportMinCgpa}
              onChange={e => setExportMinCgpa(e.target.value)}
            >
              <option value="all">All CGPAs</option>
              <option value="7.0">CGPA ≥ 7.0</option>
              <option value="7.5">CGPA ≥ 7.5</option>
              <option value="8.0">CGPA ≥ 8.0</option>
              <option value="8.5">CGPA ≥ 8.5</option>
              <option value="9.0">CGPA ≥ 9.0</option>
            </select>
          </div>

          {/* Search by USN or Name */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem', display: 'block' }}>
              Search Candidate:
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                className="form-input"
                placeholder="Search USN or Name..."
                value={exportSearch}
                onChange={e => setExportSearch(e.target.value)}
                style={{ paddingLeft: '2rem' }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>

        {/* Live Filter Summary Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Found <strong style={{ color: '#38bdf8' }}>{filteredExportApplicants.length}</strong> matching candidates for{' '}
            <strong style={{ color: '#ffffff' }}>{drives.find(d => d.id === exportDriveId)?.company_name || 'Selected Company'}</strong>
          </div>

          {(exportStage !== 'all' || exportBranch !== 'all' || exportMinCgpa !== 'all' || exportSearch) && (
            <button 
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              onClick={() => {
                setExportStage('all');
                setExportBranch('all');
                setExportMinCgpa('all');
                setExportSearch('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Preview Table of Filtered Candidates */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>USN</th>
                <th>Candidate Name</th>
                <th>Branch</th>
                <th>Certified CGPA</th>
                <th>Current Stage</th>
                <th>Resume Link</th>
                <th>Applied On</th>
                <th>Admin Stage Override</th>
              </tr>
            </thead>
            <tbody>
              {loadingExport ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading company candidate roster...
                  </td>
                </tr>
              ) : filteredExportApplicants.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No candidates match the active filters for this company.
                  </td>
                </tr>
              ) : (
                filteredExportApplicants.map(app => {
                  const stageObj = stages.find(s => s.key === app.application_status);
                  const badgeClass = stageObj?.badgeClass || 'badge-stage-applied';

                  return (
                    <tr key={app.id}>
                      <td><strong style={{ color: '#ffffff' }}>{app.usn}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{app.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{app.student_email}</div>
                      </td>
                      <td>{app.verified_branch}</td>
                      <td><strong style={{ color: '#34d399' }}>{Number(app.verified_cgpa || 0).toFixed(2)}</strong></td>
                      <td>
                        <span className={`badge-stage ${badgeClass}`}>
                          {app.application_status ? app.application_status.replace('_', ' ') : 'applied'}
                        </span>
                      </td>
                      <td>
                        {app.resume_url ? (
                          <a 
                            href={app.resume_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <ExternalLink size={12} color="#38bdf8" /> Open Resume
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Not provided</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {app.applied_at ? app.applied_at.split(' ')[0] : 'N/A'}
                      </td>
                      <td>
                        <select
                          className="stage-selector-dropdown"
                          value={app.application_status || 'applied'}
                          onChange={e => handleAdminStageChange(app.id, e.target.value, app.student_name)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Admin can advance or update student recruitment round"
                        >
                          {stages.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
