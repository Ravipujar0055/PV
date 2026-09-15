import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { Download, Search, ExternalLink, Copy } from 'lucide-react';

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadDrives() {
      try {
        const res = await api.getCompanies();
        setDrives(res.drives || []);
      } catch (err) {
        console.error('Failed to load companies for filter', err);
      }
    }
    loadDrives();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.append('driveId', companyFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (branchFilter) params.append('branch', branchFilter);
      if (minCgpaFilter) params.append('minCgpa', minCgpaFilter);
      if (search) params.append('search', search);

      const res = await api.getAllApplicationsAdmin(params.toString());
      setApplications(res.applications || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Failed to load applications.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [companyFilter, statusFilter, branchFilter, minCgpaFilter]);

  const handleStageChange = async (appId, newStage) => {
    try {
      await api.updateApplicationStage(appId, newStage);
      setMessage({ type: 'success', text: `Candidate stage updated to '${newStage}'.` });
      fetchApplications();
    } catch (err) {
      alert(err.data?.error || 'Failed to update recruitment stage');
    }
  };

  const handleExportExcel = () => {
    if (applications.length === 0) {
      alert('No candidate applications match the selected criteria to export.');
      return;
    }

    const exportData = applications.map((a, index) => {
      let resumeLink = 'Not Provided';
      if (a.resume_url) {
        resumeLink = a.resume_url.startsWith('http') ? a.resume_url : `${window.location.origin}${a.resume_url}`;
      }

      return {
        'Sl No': index + 1,
        'USN': a.usn,
        'Candidate Name': a.student_name,
        'Email Address': a.student_email,
        'Mobile Number': a.student_mobile || 'N/A',
        'Company': a.company_name,
        'Role Title': a.job_role,
        'Package (CTC)': a.ctc_lpa ? `₹${a.ctc_lpa} LPA` : 'N/A',
        'Degree Branch': a.verified_branch,
        'Certified CGPA': Number(a.verified_cgpa || 0).toFixed(2),
        '10th Marks (%)': a.tenth_percentage ? `${Number(a.tenth_percentage).toFixed(1)}%` : 'N/A',
        '12th Marks (%)': a.twelfth_percentage ? `${Number(a.twelfth_percentage).toFixed(1)}%` : 'N/A',
        'Active Backlogs': a.active_backlogs ?? 0,
        'Verification Status': a.verification_status || 'VERIFIED',
        'Recruitment Stage': a.application_status ? a.application_status.toUpperCase().replace('_', ' ') : 'APPLIED',
        'Applied Date': a.applied_at ? a.applied_at.split(' ')[0] : 'N/A',
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');

    const selectedDrive = drives.find(d => d.id === companyFilter);
    const companyPrefix = selectedDrive ? `${(selectedDrive.companyName || selectedDrive.company_name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_')}_` : 'All_Companies_';
    const stageSuffix = statusFilter ? `_${statusFilter.toUpperCase()}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${companyPrefix}Candidate_Roster_For_Students${stageSuffix}_${dateStr}.xlsx`);
    setMessage({ type: 'success', text: `Downloaded candidate roster (${applications.length} students). Ready to share with students.` });
  };

  const handleCopyStudentAnnouncement = () => {
    if (applications.length === 0) {
      alert('No candidates found matching the active filter to generate an announcement.');
      return;
    }

    const selectedDrive = drives.find(d => d.id === companyFilter);
    const company = selectedDrive ? (selectedDrive.companyName || selectedDrive.company_name) : 'Campus Placement';
    const stageLabel = statusFilter ? (stages.find(s => s.key === statusFilter)?.label || statusFilter) : 'Active Candidates';

    let text = `📢 CAMPUS PLACEMENT SHORTLIST ANNOUNCEMENT — ${company.toUpperCase()}\n`;
    text += `Stage / Round: ${stageLabel.toUpperCase()}\n`;
    text += `Total Candidates: ${applications.length}\n\n`;
    text += `Candidate Shortlist:\n`;

    applications.forEach((s, idx) => {
      text += `${idx + 1}. ${s.usn} — ${s.student_name} (${s.verified_branch}) — CGPA: ${Number(s.verified_cgpa || 0).toFixed(2)}\n`;
    });

    text += `\nPlease log in to your Student Placement Dashboard to view timeline updates.\n— Institutional Placement Cell`;

    navigator.clipboard.writeText(text).then(() => {
      setMessage({
        type: 'success',
        text: `Copied student shortlist announcement to clipboard (${applications.length} students). Ready to share on WhatsApp or Email!`
      });
    }).catch(err => {
      console.error(err);
      alert('Could not copy text to clipboard.');
    });
  };

  const stages = [
    { key: 'applied', label: 'Applied', badgeClass: 'badge-stage-applied' },
    { key: 'shortlisted', label: 'Shortlisted', badgeClass: 'badge-stage-shortlisted' },
    { key: 'assessment', label: 'Assessment', badgeClass: 'badge-stage-assessment' },
    { key: 'technical_interview', label: 'Tech Interview', badgeClass: 'badge-stage-technical' },
    { key: 'hr_interview', label: 'HR Interview', badgeClass: 'badge-stage-hr' },
    { key: 'selected', label: 'Selected', badgeClass: 'badge-stage-selected' },
    { key: 'rejected', label: 'Rejected', badgeClass: 'badge-stage-rejected' },
    { key: 'withdrawn', label: 'Withdrawn', badgeClass: 'badge-stage-withdrawn' }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.3rem' }}>Placement Applications Pipeline</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Monitor verified candidates across all recruitment rounds, advance candidate stages, and download filtered Excel rosters to share with students.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleCopyStudentAnnouncement}
            disabled={applications.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.825rem' }}
            title="Copy announcement message for WhatsApp / Email distribution"
          >
            <Copy size={15} /> Copy Notice for Students
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleExportExcel}
            disabled={applications.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Download size={16} /> Download Excel ({applications.length})
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: message.type === 'success' ? '#34d399' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Applications Pipeline: <strong style={{ color: '#38bdf8' }}>{applications.length}</strong> matching candidates
          </div>

          {(companyFilter || statusFilter || branchFilter || minCgpaFilter || search) && (
            <button 
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              onClick={() => {
                setCompanyFilter('');
                setStatusFilter('');
                setBranchFilter('');
                setMinCgpaFilter('');
                setSearch('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          {/* Company Filter */}
          <select 
            className="form-select" 
            value={companyFilter} 
            onChange={e => setCompanyFilter(e.target.value)}
          >
            <option value="">All Companies</option>
            {drives.map(d => (
              <option key={d.id} value={d.id}>{d.companyName || d.company_name} — {d.title}</option>
            ))}
          </select>

          {/* Status / Stage Filter */}
          <select 
            className="form-select" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Stages</option>
            {stages.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          {/* Branch Filter */}
          <select 
            className="form-select" 
            value={branchFilter} 
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="ISE">ISE</option>
            <option value="AIML">AIML</option>
            <option value="AIDS">AIDS</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
          </select>

          {/* Min CGPA Filter */}
          <select 
            className="form-select" 
            value={minCgpaFilter} 
            onChange={e => setMinCgpaFilter(e.target.value)}
          >
            <option value="">All CGPAs</option>
            <option value="7.0">CGPA ≥ 7.0</option>
            <option value="7.5">CGPA ≥ 7.5</option>
            <option value="8.0">CGPA ≥ 8.0</option>
            <option value="8.5">CGPA ≥ 8.5</option>
            <option value="9.0">CGPA ≥ 9.0</option>
          </select>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text"
              className="form-input"
              placeholder="Search USN or Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchApplications(); }}
              style={{ paddingLeft: '2rem' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>USN</th>
              <th>Student Name</th>
              <th>Company</th>
              <th>Role</th>
              <th>Package</th>
              <th>Branch</th>
              <th>Certified CGPA</th>
              <th>Resume Link</th>
              <th>Eligibility</th>
              <th>Recruitment Stage</th>
              <th>Advance Stage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading pipeline...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No applications found matching filters.
                </td>
              </tr>
            ) : (
              applications.map(a => (
                <tr key={a.id}>
                  <td><strong style={{ color: '#ffffff' }}>{a.usn}</strong></td>
                  <td>{a.student_name}</td>
                  <td><strong style={{ color: '#ffffff' }}>{a.company_name}</strong></td>
                  <td>{a.job_role}</td>
                  <td style={{ color: '#34d399', fontWeight: 700 }}>₹{a.ctc_lpa} LPA</td>
                  <td>{a.verified_branch}</td>
                  <td><strong style={{ color: '#ffffff' }}>{a.verified_cgpa ? Number(a.verified_cgpa).toFixed(2) : 'N/A'}</strong></td>
                  <td>
                    {a.resume_url ? (
                      <a 
                        href={a.resume_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title={a.resume_url}
                      >
                        <ExternalLink size={12} color="#38bdf8" /> Drive Resume
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Not provided</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-verified">
                      ✓ Cleared
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const stageObj = stages.find(s => s.key === a.application_status);
                      const badgeClass = stageObj?.badgeClass || 'badge-stage-applied';
                      return (
                        <span className={`badge-stage ${badgeClass}`}>
                          {a.application_status ? a.application_status.replace('_', ' ') : 'applied'}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <select
                      className="stage-selector-dropdown"
                      value={a.application_status || 'applied'}
                      onChange={e => handleStageChange(a.id, e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      title="Advance or modify candidate stage"
                    >
                      {stages.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
