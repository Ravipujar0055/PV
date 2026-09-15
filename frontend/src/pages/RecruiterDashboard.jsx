import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { 
  Building2, FileText, CheckCircle2, ExternalLink,
  Download, ShieldCheck, Search, Filter,
  XCircle, FileSpreadsheet, Users, Star, Code, User, Trophy, Phone, Mail
} from 'lucide-react';

export default function RecruiterDashboard() {
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingAppId, setUpdatingAppId] = useState(null);
  const [message, setMessage] = useState(null);

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [minCgpaFilter, setMinCgpaFilter] = useState('all');
  const [backlogFilter, setBacklogFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('cgpa_desc'); // cgpa_desc, applied_desc, name_asc

  const stages = useMemo(() => [
    { key: 'applied', label: 'Applied', icon: FileText, color: '#38bdf8', badgeClass: 'badge-stage-applied' },
    { key: 'shortlisted', label: 'Shortlisted', icon: Star, color: '#f59e0b', badgeClass: 'badge-stage-shortlisted' },
    { key: 'assessment', label: 'Assessment', icon: FileSpreadsheet, color: '#0ea5e9', badgeClass: 'badge-stage-assessment' },
    { key: 'technical_interview', label: 'Tech Round', icon: Code, color: '#a855f7', badgeClass: 'badge-stage-technical' },
    { key: 'hr_interview', label: 'HR Round', icon: User, color: '#ec4899', badgeClass: 'badge-stage-hr' },
    { key: 'selected', label: 'Offer Extended', icon: Trophy, color: '#10b981', badgeClass: 'badge-stage-selected' },
    { key: 'rejected', label: 'Rejected', icon: XCircle, color: '#ef4444', badgeClass: 'badge-stage-rejected' }
  ], []);

  // Next logical stage mapping for 1-click advance
  const nextStageMap = {
    applied: 'shortlisted',
    shortlisted: 'assessment',
    assessment: 'technical_interview',
    technical_interview: 'hr_interview',
    hr_interview: 'selected'
  };

  const nextStageButtonLabels = {
    applied: 'Shortlist →',
    shortlisted: 'Assessment →',
    assessment: 'Tech Round →',
    technical_interview: 'HR Round →',
    hr_interview: 'Offer / Select 🎉'
  };

  useEffect(() => {
    async function loadDrives() {
      try {
        setLoading(true);
        const res = await api.getCompanies();
        const driveList = res.drives || [];
        setDrives(driveList);
        if (driveList.length > 0) {
          setSelectedDriveId(driveList[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch authorized drives:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDrives();
  }, []);

  useEffect(() => {
    if (!selectedDriveId) return;

    async function loadApplicants() {
      try {
        const res = await api.getDriveApplications(selectedDriveId);
        setApplicants(res.applications || []);
      } catch (err) {
        console.error('Failed to load drive applicants:', err);
      }
    }
    loadApplicants();
  }, [selectedDriveId]);

  // Stage change handler with optimistic update and real-time backend persistence
  const handleStageChange = async (appId, newStage, candidateName = '') => {
    if (!appId || !newStage) return;

    // Previous status for rollback
    const previousApp = applicants.find(a => a.id === appId);
    const prevStatus = previousApp?.application_status;

    // 1. Optimistic Update
    setApplicants(prev => prev.map(app => (app.id === appId ? { ...app, application_status: newStage } : app)));
    setUpdatingAppId(appId);

    try {
      await api.updateApplicationStage(appId, newStage);
      const stageObj = stages.find(s => s.key === newStage);
      const stageName = stageObj ? stageObj.label : newStage;
      setMessage({
        type: 'success',
        text: `Updated ${candidateName || previousApp?.student_name || 'candidate'} to stage: ${stageName}. Changes reflected for Admin & Student portals.`
      });
    } catch (err) {
      // Rollback on error
      if (prevStatus) {
        setApplicants(prev => prev.map(app => (app.id === appId ? { ...app, application_status: prevStatus } : app)));
      }
      alert(err.data?.error || err.message || 'Failed to update recruitment stage');
    } finally {
      setUpdatingAppId(null);
    }
  };

  const currentDrive = drives.find(d => d.id === selectedDriveId);

  // Compute counts per stage for the visual funnel
  const stageCounts = useMemo(() => {
    const counts = { all: applicants.length };
    stages.forEach(s => { counts[s.key] = 0; });
    counts.withdrawn = 0;

    applicants.forEach(app => {
      const st = app.application_status || 'applied';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.applied++;
      }
    });
    return counts;
  }, [applicants, stages]);

  // Compute available branches
  const availableBranches = useMemo(() => {
    return Array.from(new Set(applicants.map(a => a.verified_branch).filter(Boolean))).sort();
  }, [applicants]);

  // Filtered & sorted applicants
  const filteredApplicants = useMemo(() => {
    return applicants.filter(app => {
      if (statusFilter !== 'all' && app.application_status !== statusFilter) return false;
      if (branchFilter !== 'all' && (app.verified_branch || '').toUpperCase() !== branchFilter.toUpperCase()) return false;
      if (minCgpaFilter !== 'all' && Number(app.verified_cgpa || 0) < Number(minCgpaFilter)) return false;
      if (backlogFilter === 'zero' && Number(app.active_backlogs || 0) > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const usnMatch = (app.usn || '').toLowerCase().includes(q);
        const nameMatch = (app.student_name || '').toLowerCase().includes(q);
        const emailMatch = (app.student_email || '').toLowerCase().includes(q);
        const skillsMatch = Array.isArray(app.skills) && app.skills.some(sk => sk.toLowerCase().includes(q));
        if (!usnMatch && !nameMatch && !emailMatch && !skillsMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'cgpa_desc') {
        return Number(b.verified_cgpa || 0) - Number(a.verified_cgpa || 0);
      }
      if (sortBy === 'applied_desc') {
        return new Date(b.applied_at || 0) - new Date(a.applied_at || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.student_name || '').localeCompare(b.student_name || '');
      }
      return 0;
    });
  }, [applicants, statusFilter, branchFilter, minCgpaFilter, backlogFilter, searchQuery, sortBy]);

  // Excel Roster Export
  const handleExportExcel = () => {
    if (filteredApplicants.length === 0) {
      alert('No candidate applications match the selected filter criteria to export.');
      return;
    }

    const exportData = filteredApplicants.map((app, index) => {
      let resumeLink = 'Not Provided';
      if (app.resume_url) {
        resumeLink = app.resume_url.startsWith('http') ? app.resume_url : `${window.location.origin}${app.resume_url}`;
      }

      const stageObj = stages.find(s => s.key === app.application_status);
      const stageFormatted = stageObj ? stageObj.label : (app.application_status ? app.application_status.toUpperCase().replace('_', ' ') : 'APPLIED');

      return {
        'Sl No': index + 1,
        'Candidate USN': app.usn,
        'Candidate Name': app.student_name,
        'Email Address': app.student_email,
        'Mobile Number': app.student_mobile || 'N/A',
        'Degree Branch': app.verified_branch,
        'Certified CGPA': Number(app.verified_cgpa || 0).toFixed(2),
        '10th Marks (%)': app.tenth_percentage ? `${Number(app.tenth_percentage).toFixed(1)}%` : 'N/A',
        '12th Marks (%)': app.twelfth_percentage ? `${Number(app.twelfth_percentage).toFixed(1)}%` : 'N/A',
        'Active Backlogs': app.active_backlogs ?? 0,
        'Verification Status': app.verification_status || 'VERIFIED',
        'Recruitment Stage': stageFormatted,
        'Applied Date': app.applied_at ? app.applied_at.split(' ')[0] : 'N/A',
        'Public Resume Link': resumeLink,
        'Key Skills': Array.isArray(app.skills) ? app.skills.join(', ') : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 25 },
      { wch: 28 },
      { wch: 16 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 },
      { wch: 50 },
      { wch: 30 }
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = (currentDrive?.companyName || 'Candidates').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const cleanCompany = (currentDrive?.companyName || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanRole = (currentDrive?.title || 'Drive').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filterSuffix = statusFilter !== 'all' ? `_${statusFilter}` : (branchFilter !== 'all' ? `_${branchFilter}` : '');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${cleanCompany}_${cleanRole}_Candidate_Roster${filterSuffix}_${dateStr}.xlsx`);
  };

  const getStageBadge = (stageKey) => {
    const stage = stages.find(s => s.key === stageKey);
    if (!stage) {
      if (stageKey === 'withdrawn') {
        return <span className="badge-stage badge-stage-withdrawn">Withdrawn</span>;
      }
      return <span className="badge-stage badge-stage-applied">Applied</span>;
    }
    const Icon = stage.icon;
    return (
      <span className={`badge-stage ${stage.badgeClass}`}>
        <Icon size={12} /> {stage.label}
      </span>
    );
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge" style={{ background: '#0284c7', color: '#e0f2fe' }}>
              Recruiter Evaluation Portal
            </span>
            <span className="badge badge-verified">
              <ShieldCheck size={12} /> Institutional Certified Applicants
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>Candidate Evaluation & Stage Pipeline</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Evaluate certified candidates, advance students through recruitment rounds, and export official candidate rosters. Changes sync in real-time with Admin and Student portals.
          </p>
        </div>

        {drives.length > 0 && (
          <button 
            className="btn btn-primary" 
            onClick={handleExportExcel}
            disabled={applicants.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 700 }}
          >
            <Download size={16} /> Download Excel (.xlsx)
          </button>
        )}
      </div>

      {message && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: message.type === 'success' ? '#34d399' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
        </div>
      )}

      {/* Drive Selector */}
      {drives.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', marginBottom: '2rem' }}>
          <Building2 size={48} color="var(--text-dim)" style={{ margin: '0 auto 1.25rem' }} />
          <h3 style={{ marginBottom: '0.5rem', color: '#ffffff' }}>No Authorized Companies Assigned</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto' }}>
            Your recruiter account has no active company drives assigned. Placement administrators can authorize access to your organization via the Admin Companies portal.
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Authorized Company & Placement Drive:</label>
                <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                  <ShieldCheck size={11} /> Verified Access
                </span>
              </div>
              <select 
                className="form-select"
                value={selectedDriveId || ''} 
                onChange={e => setSelectedDriveId(e.target.value)}
                style={{ minWidth: '340px', fontWeight: 600 }}
              >
                {drives.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.companyName} — {d.title} (₹{d.ctcLpa} LPA)
                  </option>
                ))}
              </select>
            </div>

            {currentDrive && (
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Total Applicants:</span>
                  <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.3rem' }}>{applicants.length}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Offers / Selected:</span>
                  <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1.3rem' }}>{stageCounts.selected || 0}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Min CGPA Cutoff:</span>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.3rem' }}>{currentDrive.requirements.min_cgpa.toFixed(2)}</div>
                </div>
                <div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportExcel}
                    disabled={filteredApplicants.length === 0}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Download size={14} /> Export Filtered ({filteredApplicants.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECRUITMENT PIPELINE STAGE FUNNEL (INTERACTIVE CHIPS) */}
      {drives.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recruitment Funnel & Stage Progression:
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Click any stage chip to instantly filter candidates
            </span>
          </div>

          <div className="pipeline-funnel">
            {/* All Chip */}
            <div 
              className={`pipeline-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <div className="pipeline-chip-count">{stageCounts.all}</div>
              <div className="pipeline-chip-label">
                <Users size={12} color="#818cf8" /> All Applicants
              </div>
            </div>

            {/* Stage Chips */}
            {stages.map(stage => {
              const Icon = stage.icon;
              const count = stageCounts[stage.key] || 0;
              const isActive = statusFilter === stage.key;

              return (
                <div 
                  key={stage.key}
                  className={`pipeline-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setStatusFilter(stage.key)}
                  style={{
                    borderColor: isActive ? stage.color : undefined
                  }}
                >
                  <div className="pipeline-chip-count" style={{ color: count > 0 ? stage.color : 'inherit' }}>
                    {count}
                  </div>
                  <div className="pipeline-chip-label" style={{ color: isActive ? stage.color : undefined }}>
                    <Icon size={12} color={stage.color} /> {stage.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER TOOLBAR FOR RECRUITER */}
      {drives.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Filter size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>Advanced Filters:</span>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', fontSize: '0.75rem' }}>
                Showing {filteredApplicants.length} of {applicants.length} candidates
              </span>
              {statusFilter !== 'all' && (
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.75rem' }}>
                  Stage: {stages.find(s => s.key === statusFilter)?.label || statusFilter}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {(statusFilter !== 'all' || branchFilter !== 'all' || minCgpaFilter !== 'all' || backlogFilter !== 'all' || searchQuery) && (
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => {
                    setStatusFilter('all');
                    setBranchFilter('all');
                    setMinCgpaFilter('all');
                    setBacklogFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Reset Filters
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleExportExcel}
                disabled={filteredApplicants.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.9rem', fontWeight: 700 }}
                title="Download filtered candidate roster to share with placement committee or students"
              >
                <Download size={15} /> Download Filtered Excel ({filteredApplicants.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {/* Search by USN, Name, Email, or Skill */}
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                className="form-input"
                placeholder="Search USN, Name, Skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.8rem', paddingLeft: '2rem' }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Stage Filter Dropdown */}
            <select 
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="all">All Stages ({applicants.length})</option>
              {stages.map(s => (
                <option key={s.key} value={s.key}>{s.label} ({stageCounts[s.key] || 0})</option>
              ))}
              <option value="withdrawn">Withdrawn ({stageCounts.withdrawn || 0})</option>
            </select>

            {/* Branch Filter */}
            <select 
              className="form-select"
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="all">All Branches</option>
              {availableBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Min CGPA Filter */}
            <select 
              className="form-select"
              value={minCgpaFilter}
              onChange={e => setMinCgpaFilter(e.target.value)}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="all">All CGPAs</option>
              <option value="7.0">CGPA ≥ 7.0</option>
              <option value="7.5">CGPA ≥ 7.5</option>
              <option value="8.0">CGPA ≥ 8.0</option>
              <option value="8.5">CGPA ≥ 8.5</option>
              <option value="9.0">CGPA ≥ 9.0</option>
            </select>

            {/* Active Backlogs Filter */}
            <select 
              className="form-select"
              value={backlogFilter}
              onChange={e => setBacklogFilter(e.target.value)}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="all">All Backlog Status</option>
              <option value="zero">Zero Backlogs (Clear)</option>
            </select>

            {/* Sort by */}
            <select
              className="form-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="cgpa_desc">Sort: CGPA (High to Low)</option>
              <option value="applied_desc">Sort: Applied Date (Recent)</option>
              <option value="name_asc">Sort: Candidate Name (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {/* Candidate Pipeline Grid */}
      {drives.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate USN</th>
                <th>Candidate Name & Contact</th>
                <th>Branch</th>
                <th>Certified CGPA</th>
                <th>10th / 12th %</th>
                <th>Skills & Tech</th>
                <th>Resume Link</th>
                <th>Current Stage</th>
                <th style={{ minWidth: '220px' }}>Advance Stage (Per Student)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading certified candidate pool...
                  </td>
                </tr>
              ) : applicants.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No applications received yet for this drive.
                  </td>
                </tr>
              ) : filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <div>No candidates match the active filter criteria.</div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        setStatusFilter('all');
                        setBranchFilter('all');
                        setMinCgpaFilter('all');
                        setBacklogFilter('all');
                        setSearchQuery('');
                      }}
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredApplicants.map(app => {
                  const currentStatus = app.application_status || 'applied';
                  const nextStage = nextStageMap[currentStatus];
                  const nextButtonLabel = nextStageButtonLabels[currentStatus];
                  const isUpdating = updatingAppId === app.id;

                  return (
                    <tr key={app.id} style={{ opacity: isUpdating ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <strong style={{ color: '#ffffff' }}>{app.usn}</strong>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{app.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <Mail size={11} /> {app.student_email}
                        </div>
                        {app.student_mobile && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Phone size={11} /> {app.student_mobile}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{app.verified_branch}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1.05rem' }}>
                          {app.verified_cgpa ? Number(app.verified_cgpa).toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {app.tenth_percentage ? `${Number(app.tenth_percentage).toFixed(1)}%` : 'N/A'} / {app.twelfth_percentage ? `${Number(app.twelfth_percentage).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '200px' }}>
                          {app.skills && app.skills.length > 0 ? (
                            app.skills.slice(0, 3).map((sk, idx) => (
                              <span key={idx} style={{ fontSize: '0.7rem', background: 'var(--bg-surface)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#cbd5e1' }}>
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>None specified</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {app.resume_url ? (
                          <a 
                            href={app.resume_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            title={app.resume_url}
                          >
                            <ExternalLink size={12} color="#38bdf8" /> Drive Resume
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Not attached</span>
                        )}
                      </td>
                      <td>
                        {getStageBadge(currentStatus)}
                      </td>
                      <td>
                        {/* Per-Student Stage Selector & Quick Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {/* Interactive Dropdown Selector for Any Stage */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <select
                              className="stage-selector-dropdown"
                              value={currentStatus}
                              disabled={isUpdating}
                              onChange={e => handleStageChange(app.id, e.target.value, app.student_name)}
                              style={{ width: '100%' }}
                              title="Select recruitment stage for this candidate"
                            >
                              {stages.map(s => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quick Action Progression Buttons */}
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            {nextStage && (
                              <button
                                className="btn btn-primary"
                                disabled={isUpdating}
                                onClick={() => handleStageChange(app.id, nextStage, app.student_name)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.725rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}
                                title={`Advance candidate to ${stages.find(s => s.key === nextStage)?.label}`}
                              >
                                <span>{nextButtonLabel}</span>
                              </button>
                            )}

                            {currentStatus !== 'selected' && currentStatus !== 'rejected' && (
                              <button 
                                className="btn btn-danger"
                                disabled={isUpdating}
                                onClick={() => handleStageChange(app.id, 'rejected', app.student_name)}
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.725rem' }}
                                title="Reject Candidate"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
