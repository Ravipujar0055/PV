import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Building, Plus, Trash2, Edit3, ShieldCheck, UserCheck } from 'lucide-react';

export default function AdminCompanies() {
  const [drives, setDrives] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [message, setMessage] = useState(null);

  // Form State
  const initialForm = {
    companyName: '',
    industry: 'Information Technology',
    website: '',
    title: '',
    role: '',
    ctcLpa: 10.0,
    location: 'Bangalore',
    driveDate: '2026-10-15',
    deadline: '2026-10-01',
    minCgpa: 7.50,
    min10th: 60.0,
    min12th: 60.0,
    maxBacklogs: 0,
    allowBacklogHistory: false,
    allowedBranches: ['CSE', 'ISE', 'ECE'],
    graduationYear: 2027,
    maxGapMonths: 12,
    workExpRequired: false,
    recruiterUserId: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const availableBranches = ['CSE', 'ISE', 'AIML', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CYBER_SEC'];

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanies();
      setDrives(res.drives || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Failed to load drives.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const res = await api.getAdminRecruiters();
      setRecruiters(res.recruiters || []);
    } catch (err) {
      console.error('Failed to load recruiters:', err);
    }
  };

  useEffect(() => {
    fetchDrives();
    fetchRecruiters();
  }, []);

  const handleOpenCreate = () => {
    setEditingDrive(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (drive) => {
    setEditingDrive(drive);
    setFormData({
      companyName: drive.companyName || '',
      industry: drive.companyIndustry || 'Information Technology',
      website: drive.companyWebsite || '',
      title: drive.title || '',
      role: drive.role || '',
      ctcLpa: drive.ctcLpa || 10.0,
      location: drive.location || 'Bangalore',
      driveDate: drive.driveDate ? drive.driveDate.substring(0, 10) : '2026-10-15',
      deadline: drive.deadline ? drive.deadline.substring(0, 10) : '2026-10-01',
      minCgpa: drive.requirements?.min_cgpa ?? 7.50,
      min10th: drive.requirements?.min_tenth_percentage ?? 60.0,
      min12th: drive.requirements?.min_twelfth_percentage ?? 60.0,
      maxBacklogs: drive.requirements?.max_active_backlogs ?? 0,
      allowBacklogHistory: drive.requirements?.allow_backlog_history ?? false,
      allowedBranches: drive.requirements?.allowed_branches || ['CSE', 'ISE', 'ECE'],
      graduationYear: drive.requirements?.graduation_year ?? 2027,
      maxGapMonths: drive.requirements?.max_gap_months ?? 12,
      workExpRequired: drive.requirements?.work_experience_required ?? false,
      recruiterUserId: drive.recruiterUserId || ''
    });
    setShowModal(true);
  };

  const handleBranchToggle = (branch) => {
    if (formData.allowedBranches.includes(branch)) {
      setFormData({
        ...formData,
        allowedBranches: formData.allowedBranches.filter(b => b !== branch)
      });
    } else {
      setFormData({
        ...formData,
        allowedBranches: [...formData.allowedBranches, branch]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDrive) {
        await api.updateDrive(editingDrive.id, formData);
        setMessage({ type: 'success', text: `Placement drive ${formData.title} updated successfully.` });
      } else {
        await api.createDrive(formData);
        setMessage({ type: 'success', text: `Drive for ${formData.companyName} created with dynamic eligibility rules.` });
      }
      setShowModal(false);
      fetchDrives();
    } catch (err) {
      alert(err.data?.error || err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete drive '${title}'?`)) return;
    try {
      await api.deleteDrive(id);
      setMessage({ type: 'success', text: `Drive '${title}' deleted.` });
      fetchDrives();
    } catch (err) {
      alert(err.data?.error || 'Failed to delete drive');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.3rem' }}>Companies & Dynamic Eligibility Criteria</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Configure recruitment drives and institutional eligibility thresholds without hard-coding rules.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add Placement Drive
        </button>
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

      {/* Drives List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading drives...</div>
      ) : drives.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Building size={36} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3>No Placement Drives Created</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Click "Add Placement Drive" to create a company drive.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {drives.map(drive => (
            <div key={drive.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                      {drive.companyIndustry}
                    </span>
                    <span className="badge badge-verified">Active</span>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', color: '#ffffff' }}>{drive.companyName}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {drive.title} • Role: <strong style={{ color: '#e2e8f0' }}>{drive.role}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <UserCheck size={14} color="#818cf8" />
                    <span>Authorized Recruiter:</span>
                    {drive.recruiterName || drive.recruiterEmail ? (
                      <span style={{ color: '#c7d2fe', fontWeight: 600 }}>
                        {drive.recruiterName} ({drive.recruiterEmail})
                      </span>
                    ) : (
                      <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>
                        None Assigned (Restricted)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>₹{drive.ctcLpa} LPA</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Drive Date: {drive.driveDate}</div>
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleOpenEdit(drive)}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                    title="Edit Placement Drive & Recruiter"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(drive.id, drive.title)}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                    title="Delete Drive"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Dynamic Eligibility Breakdown Summary */}
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Min CGPA:</span>
                  <div style={{ fontWeight: 700, color: '#ffffff' }}>&gt;= {drive.requirements.min_cgpa.toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>10th / 12th Cutoff:</span>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{drive.requirements.min_tenth_percentage}% / {drive.requirements.min_twelfth_percentage}%</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Max Active Backlogs:</span>
                  <div style={{ fontWeight: 700, color: drive.requirements.max_active_backlogs === 0 ? '#34d399' : '#f59e0b' }}>
                    {drive.requirements.max_active_backlogs} allowed
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Backlog History:</span>
                  <div style={{ fontWeight: 600, color: drive.requirements.allow_backlog_history ? '#38bdf8' : '#f87171' }}>
                    {drive.requirements.allow_backlog_history ? 'Allowed' : 'Strictly 0 (No past)'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Graduation Batch:</span>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{drive.requirements.graduation_year}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Eligible Branches:</span>
                  <div style={{ fontWeight: 600, color: '#a5b4fc' }}>
                    {drive.requirements.allowed_branches.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DRIVE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.3rem', color: '#ffffff' }}>
                  {editingDrive ? 'Edit Placement Drive' : 'Configure New Placement Drive'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input 
                    className="form-input" 
                    value={formData.companyName} 
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    required 
                    placeholder="e.g. ABC Technologies"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry Domain</label>
                  <input 
                    className="form-input" 
                    value={formData.industry} 
                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Cloud Computing / FinTech"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Drive Title *</label>
                  <input 
                    className="form-input" 
                    value={formData.title} 
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required 
                    placeholder="e.g. Software Development Engineer (SDE-1)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Job Role</label>
                  <input 
                    className="form-input" 
                    value={formData.role} 
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    required 
                    placeholder="e.g. Full Stack Developer"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CTC Package (LPA) *</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.1" 
                    value={formData.ctcLpa} 
                    onChange={e => setFormData({ ...formData, ctcLpa: e.target.value })}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input 
                    className="form-input" 
                    value={formData.location} 
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Drive Date</label>
                  <input 
                    className="form-input" 
                    type="date"
                    value={formData.driveDate} 
                    onChange={e => setFormData({ ...formData, driveDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Deadline</label>
                  <input 
                    className="form-input" 
                    type="date"
                    value={formData.deadline} 
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <UserCheck size={15} color="#818cf8" /> Authorized Recruiter (Account Lead)
                  </label>
                  <select 
                    className="form-input" 
                    value={formData.recruiterUserId} 
                    onChange={e => setFormData({ ...formData, recruiterUserId: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">-- Select Recruiter (Only this account can access drive & candidates) --</option>
                    {recruiters.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Recruiters only see candidates, download Excel spreadsheets, and evaluate stages for companies assigned to their account.
                  </span>
                </div>
              </div>

              {/* DYNAMIC ELIGIBILITY SECTION */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#c7d2fe', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} color="#818cf8" /> Dynamic Eligibility Rules
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Minimum CGPA (Scale 10)</label>
                    <input 
                      className="form-input" 
                      type="number" 
                      step="0.01" 
                      value={formData.minCgpa} 
                      onChange={e => setFormData({ ...formData, minCgpa: e.target.value })}
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Min 10th %</label>
                    <input 
                      className="form-input" 
                      type="number" 
                      step="0.5" 
                      value={formData.min10th} 
                      onChange={e => setFormData({ ...formData, min10th: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Min 12th %</label>
                    <input 
                      className="form-input" 
                      type="number" 
                      step="0.5" 
                      value={formData.min12th} 
                      onChange={e => setFormData({ ...formData, min12th: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Max Active Backlogs</label>
                    <input 
                      className="form-input" 
                      type="number" 
                      value={formData.maxBacklogs} 
                      onChange={e => setFormData({ ...formData, maxBacklogs: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Graduation Year</label>
                    <input 
                      className="form-input" 
                      type="number" 
                      value={formData.graduationYear} 
                      onChange={e => setFormData({ ...formData, graduationYear: e.target.value })}
                    />
                  </div>
                </div>

                {/* Backlog History & Gap Checkboxes */}
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.allowBacklogHistory} 
                      onChange={e => setFormData({ ...formData, allowBacklogHistory: e.target.checked })} 
                    />
                    <span>Allow Past Backlog History (if currently 0)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.workExpRequired} 
                      onChange={e => setFormData({ ...formData, workExpRequired: e.target.checked })} 
                    />
                    <span>Work Experience Required</span>
                  </label>
                </div>

                {/* Allowed Branches Multi-Select Chips */}
                <div>
                  <label className="form-label">Allowed Academic Branches (Select all applicable)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableBranches.map(b => {
                      const selected = formData.allowedBranches.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => handleBranchToggle(b)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: selected ? 'var(--primary)' : 'var(--bg-card)',
                            color: selected ? '#ffffff' : 'var(--text-muted)',
                            border: selected ? '1px solid #818cf8' : '1px solid var(--border-medium)'
                          }}
                        >
                          {b} {selected ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Placement Drive & Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
