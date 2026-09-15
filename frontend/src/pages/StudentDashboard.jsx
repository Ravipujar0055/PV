import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Briefcase, ShieldCheck, AlertCircle, CheckCircle2, 
  AlertTriangle, Lock, Undo2, Globe
} from 'lucide-react';
import EligibilityModal from '../components/EligibilityModal';

export default function StudentDashboard({ onNavigate }) {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [applying, setApplying] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [studentResumeUrl, setStudentResumeUrl] = useState('');
  const [resumePromptDrive, setResumePromptDrive] = useState(null);
  const [inputResumeUrl, setInputResumeUrl] = useState('');
  const [message, setMessage] = useState(null);
  const [filter, setFilter] = useState('all'); // all, eligible, ineligible, applied

  const getStudentStageBadge = (stage) => {
    switch (stage) {
      case 'selected':
        return (
          <span className="badge-stage badge-stage-selected">
            🎉 Offer Extended / Selected
          </span>
        );
      case 'technical_interview':
        return (
          <span className="badge-stage badge-stage-technical">
            💻 Technical Round
          </span>
        );
      case 'hr_interview':
        return (
          <span className="badge-stage badge-stage-hr">
            👔 HR Interview Round
          </span>
        );
      case 'assessment':
        return (
          <span className="badge-stage badge-stage-assessment">
            📝 Online Assessment
          </span>
        );
      case 'shortlisted':
        return (
          <span className="badge-stage badge-stage-shortlisted">
            ⭐ Shortlisted
          </span>
        );
      case 'rejected':
        return (
          <span className="badge-stage badge-stage-rejected">
            ✕ Process Concluded
          </span>
        );
      case 'withdrawn':
        return (
          <span className="badge-stage badge-stage-withdrawn">
            ⊘ Withdrawn
          </span>
        );
      default:
        return (
          <span className="badge-stage badge-stage-applied">
            ✓ Applied (Under Review)
          </span>
        );
    }
  };

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const [res, profileRes] = await Promise.all([
        api.getCompanies(),
        api.getStudentProfile().catch(() => null)
      ]);
      setDrives(res.drives || []);
      if (profileRes?.profile) {
        const savedUrl = profileRes.profile.resumeUrl || profileRes.profile.resumePath || '';
        setStudentResumeUrl(savedUrl);
        setInputResumeUrl(savedUrl);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Failed to load placement drives.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleApply = async (driveId, customResumeUrl) => {
    const resumeUrlToUse = (customResumeUrl !== undefined ? customResumeUrl : studentResumeUrl || '').trim();

    // If no resume URL is set, prompt user to enter one
    if (!resumeUrlToUse && !resumePromptDrive) {
      const targetDrive = drives.find(d => d.id === driveId);
      setResumePromptDrive(targetDrive || { id: driveId, companyName: 'Placement Drive' });
      return;
    }

    try {
      setApplying(true);
      const res = await api.applyToDrive(driveId, { resumeUrl: resumeUrlToUse });
      setMessage({ type: 'success', text: res.message });
      setSelectedDrive(null);
      setResumePromptDrive(null);
      if (resumeUrlToUse) {
        setStudentResumeUrl(resumeUrlToUse);
      }
      await fetchDrives(); // Refresh status
    } catch (err) {
      setMessage({
        type: 'danger',
        text: err.data?.error || err.message || 'Application rejected: your institutional academic record does not satisfy the criteria.'
      });
      setSelectedDrive(null);
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async (applicationId, companyName) => {
    if (!applicationId) {
      alert('Application record not found. Refreshing drives...');
      await fetchDrives();
      return;
    }

    if (!window.confirm(`Are you sure you want to withdraw your application for ${companyName || 'this company'}? You will be able to re-apply if the drive remains open.`)) {
      return;
    }

    try {
      setWithdrawingId(applicationId);
      const res = await api.withdrawApplication(applicationId);
      setMessage({ type: 'success', text: res.message || `Application for ${companyName} withdrawn successfully.` });
      setSelectedDrive(null);
      await fetchDrives();
    } catch (err) {
      setMessage({ type: 'danger', text: err.data?.error || err.message || 'Failed to withdraw application.' });
    } finally {
      setWithdrawingId(null);
    }
  };

  const eligibleDrives = drives.filter(d => d.eligibility && d.eligibility.isEligible);
  const ineligibleDrives = drives.filter(d => !d.eligibility || !d.eligibility.isEligible);
  const appliedDrives = drives.filter(d => d.hasApplied);

  const filteredDrives = drives.filter(d => {
    if (filter === 'eligible') return d.eligibility && d.eligibility.isEligible;
    if (filter === 'ineligible') return !d.eligibility || !d.eligibility.isEligible;
    if (filter === 'applied') return d.hasApplied;
    return true;
  });

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>Campus Placement Drives</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Explore recruitment drives evaluated deterministically against your certified institutional academic record.
        </p>
      </div>

      {/* Real-Time Criteria Verification Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1.25rem',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        color: '#c7d2fe'
      }}>
        <ShieldCheck size={22} color="#818cf8" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
          <strong style={{ color: '#ffffff' }}>Verified Criteria Matching Engine:</strong> All campus drives are displayed. Drives where your verified CGPA, branch, backlogs, and cutoffs satisfy company rules are open for registration; drives with criteria mismatches are locked with detailed disqualification diagnostics.
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          color: message.type === 'success' ? '#34d399' : '#f87171'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message.text}</span>
          </div>
          <button 
            onClick={() => setMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Filters & Status summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          >
            All Drives ({drives.length})
          </button>
          <button 
            className={`btn ${filter === 'eligible' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('eligible')}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          >
            Eligible to Apply ({eligibleDrives.length})
          </button>
          <button 
            className={`btn ${filter === 'ineligible' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('ineligible')}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          >
            Criteria Mismatch ({ineligibleDrives.length})
          </button>
          <button 
            className={`btn ${filter === 'applied' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('applied')}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          >
            Applied ({appliedDrives.length})
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Showing {filteredDrives.length} opportunities
        </div>
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Evaluating institutional criteria & loading placement opportunities...
        </div>
      ) : drives.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', maxWidth: '600px', margin: '2rem auto' }}>
          <Briefcase size={48} color="var(--text-dim)" style={{ margin: '0 auto 1.25rem' }} />
          <h3 style={{ marginBottom: '0.75rem', color: '#ffffff' }}>No Placement Drives Available</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            There are currently no active placement drives configured by the institution.
          </p>
        </div>
      ) : filteredDrives.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Briefcase size={36} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No drives in this tab</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Switch back to "All Drives" to explore all campus opportunities.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredDrives.map(drive => {
            const isEligible = drive.eligibility ? drive.eligibility.isEligible : false;
            const failedReasons = drive.eligibility?.failedReasons || [];

            const isSelectedOffer = drive.applicationStatus === 'selected';

            return (
              <div 
                key={drive.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  position: 'relative',
                  border: isSelectedOffer 
                    ? '1px solid #10b981'
                    : isEligible 
                      ? '1px solid var(--border-medium)' 
                      : '1px solid rgba(239, 68, 68, 0.35)',
                  boxShadow: isSelectedOffer 
                    ? '0 0 16px rgba(16, 185, 129, 0.25)' 
                    : isEligible 
                      ? 'var(--shadow-md)' 
                      : '0 4px 15px rgba(239, 68, 68, 0.08)'
                }}
              >
                {/* Top Badge Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '0.2rem 0.6rem', borderRadius: 4 }}>
                    {drive.companyIndustry || 'Technology'}
                  </span>

                  {drive.hasApplied ? (
                    getStudentStageBadge(drive.applicationStatus)
                  ) : isEligible ? (
                    <span className="badge badge-eligible">✓ Criteria Satisfied</span>
                  ) : (
                    <span 
                      className="badge" 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        color: '#f87171', 
                        border: '1px solid rgba(239, 68, 68, 0.35)', 
                        fontWeight: 700 
                      }}
                    >
                      ✕ Criteria Mismatch
                    </span>
                  )}
                </div>

                {/* Company & Title */}
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: '#ffffff' }}>{drive.companyName}</h3>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.85rem' }}>
                  {drive.title} • <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{drive.role}</span>
                </div>

                {/* Key Metrics */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.6rem', 
                  background: 'var(--bg-surface)', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)', 
                  marginBottom: '1rem', 
                  fontSize: '0.8rem' 
                }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Package (CTC):</span>
                    <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>₹{drive.ctcLpa} LPA</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Drive Date:</span>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{drive.driveDate}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Min CGPA:</span>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{drive.requirements.min_cgpa.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Max Backlogs:</span>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{drive.requirements.max_active_backlogs}</div>
                  </div>
                </div>

                {/* Quick Criteria Pill List */}
                <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div><strong>Eligible Branches:</strong> {drive.requirements.allowed_branches.join(', ')}</div>
                  <div><strong>Application Deadline:</strong> {drive.deadline}</div>
                </div>

                {/* Eligibility Diagnostic Alert / Failed Criteria Box */}
                {isEligible ? (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.25rem',
                    fontSize: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: '#6ee7b7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <CheckCircle2 size={15} color="#34d399" />
                    <span>Verified Institutional Criteria Satisfied — Ready for Registration</span>
                  </div>
                ) : (
                  <div style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.25rem',
                    fontSize: '0.78rem',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5'
                  }}>
                    <div style={{ fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <AlertTriangle size={15} color="#f87171" />
                      <span>Unmatching Criteria (Registration Blocked):</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.5 }}>
                      {failedReasons.length > 0 ? (
                        failedReasons.map((reason, idx) => (
                          <li key={idx} style={{ color: '#fca5a5' }}>{reason}</li>
                        ))
                      ) : (
                        <li>Institutional academic criteria not satisfied.</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Live Recruitment Stage Banner for Applied Drives */}
                {drive.hasApplied && (
                  <div style={{
                    background: drive.applicationStatus === 'selected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                    border: drive.applicationStatus === 'selected' ? '1px solid #10b981' : '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Recruitment Stage: </span>
                      <strong style={{ color: drive.applicationStatus === 'selected' ? '#34d399' : '#ffffff' }}>
                        {(drive.applicationStatus || 'applied').replace('_', ' ').toUpperCase()}
                      </strong>
                    </div>
                    {onNavigate && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => onNavigate('applications')}
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem' }}
                      >
                        Track Timeline →
                      </button>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                    onClick={() => setSelectedDrive(drive)}
                  >
                    View Checklist
                  </button>

                  {drive.hasApplied ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flex: 1.4 }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled 
                        style={{ flex: 1, padding: '0.55rem 0.35rem', fontSize: '0.78rem', cursor: 'default', whiteSpace: 'nowrap', opacity: 0.9 }}
                      >
                        ✓ Applied
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ 
                          padding: '0.55rem 0.65rem', 
                          fontSize: '0.78rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.3rem',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleWithdraw(drive.applicationId, drive.companyName)}
                        disabled={withdrawingId === drive.applicationId || drive.applicationStatus === 'selected'}
                        title={drive.applicationStatus === 'selected' ? 'Offer extended - cannot withdraw' : 'Withdraw application'}
                      >
                        <Undo2 size={13} />
                        <span>{withdrawingId === drive.applicationId ? '...' : 'Withdraw'}</span>
                      </button>
                    </div>
                  ) : isEligible ? (
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                      onClick={() => handleApply(drive.id)}
                      disabled={applying}
                    >
                      Apply Now
                    </button>
                  ) : (
                    <button 
                      className="btn btn-danger" 
                      disabled 
                      style={{ 
                        flex: 1, 
                        padding: '0.55rem', 
                        fontSize: '0.8rem',
                        opacity: 0.65, 
                        cursor: 'not-allowed', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.35rem' 
                      }}
                      title="Registration is blocked because your verified academic records do not meet company thresholds"
                    >
                      <Lock size={13} />
                      <span>Registration Blocked</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Itemized Eligibility Breakdown Modal */}
      {selectedDrive && (
        <EligibilityModal 
          drive={{ ...selectedDrive, savedResumeUrl: studentResumeUrl }}
          onClose={() => setSelectedDrive(null)}
          onApply={handleApply}
          onWithdraw={handleWithdraw}
          applying={applying}
        />
      )}

      {/* Quick Resume Link Prompt Modal if applying without saved link */}
      {resumePromptDrive && (
        <div className="modal-overlay" onClick={() => setResumePromptDrive(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={22} color="#38bdf8" />
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: 0 }}>Public Resume Drive Link Required</h2>
              </div>
              <button 
                onClick={() => setResumePromptDrive(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Applying to <strong style={{ color: '#ffffff' }}>{resumePromptDrive.companyName}</strong> requires your public Google Drive or cloud resume URL.
            </p>

            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              color: '#bae6fd'
            }}>
              Ensure your Google Drive link sharing permission is set to <strong>"Anyone with the link can view"</strong> so recruiters can review your CV.
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!inputResumeUrl.trim()) return;
              handleApply(resumePromptDrive.id, inputResumeUrl.trim());
            }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Resume Drive URL</label>
                <input 
                  type="url"
                  className="form-input"
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  value={inputResumeUrl}
                  onChange={e => setInputResumeUrl(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResumePromptDrive(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={applying}>
                  {applying ? 'Submitting...' : 'Save Link & Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
