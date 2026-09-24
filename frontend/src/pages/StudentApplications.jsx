import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Briefcase, CheckCircle2, XCircle, FileCheck, ShieldCheck } from 'lucide-react';

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [message, setMessage] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const loadApps = async () => {
    try {
      setLoading(true);
      const res = await api.getStudentApplications();
      setApplications(res.applications || []);
    } catch (err) {
      console.error('Failed to load applications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const handleWithdraw = async (appId, companyName) => {
    if (!window.confirm(`Are you sure you want to withdraw your application for ${companyName}? This action will update your application status.`)) {
      return;
    }

    try {
      setWithdrawingId(appId);
      const res = await api.withdrawApplication(appId);
      setMessage({ type: 'success', text: res.message || `Application for ${companyName} withdrawn successfully.` });
      await loadApps();
    } catch (err) {
      alert(err.data?.error || err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawingId(null);
    }
  };

  const stages = [
    { key: 'applied', label: 'Applied' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'technical_interview', label: 'Technical' },
    { key: 'hr_interview', label: 'HR Round' },
    { key: 'selected', label: 'Selected' }
  ];

  const getStageIndex = (stage) => {
    if (stage === 'rejected' || stage === 'withdrawn') return -1;
    return stages.findIndex(s => s.key === stage);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>My Placement Applications</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Track the live status of your company applications across all recruitment stages, or withdraw active submissions.
        </p>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: 'var(--success-bg)',
          color: '#34d399',
          border: '1px solid var(--success-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Briefcase size={36} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Applications Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            You have not applied to any campus drives yet. Check the Available Drives tab to apply for eligible companies.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {applications.map(app => {
            const isRejected = app.application_status === 'rejected';
            const isSelected = app.application_status === 'selected';
            const isWithdrawn = app.application_status === 'withdrawn';
            const currentIdx = getStageIndex(app.application_status);

            return (
              <div key={app.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                        {app.company_industry || 'Corporate'}
                      </span>
                      <span className="badge badge-verified">
                        <ShieldCheck size={12} /> Institutional Cleared
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.3rem', color: '#ffffff' }}>{app.company_name}</h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {app.job_role} • Package: <strong style={{ color: '#34d399' }}>₹{app.ctc_lpa} LPA</strong> • Applied on {app.applied_at?.split(' ')[0]}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      {isSelected ? (
                        <span className="badge" style={{ background: '#065f46', color: '#6ee7b7', border: '1px solid #10b981', fontSize: '0.85rem' }}>
                          🎉 Selected / Offer Extended
                        </span>
                      ) : isRejected ? (
                        <span className="badge" style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444' }}>
                          ✕ Not Selected
                        </span>
                      ) : isWithdrawn ? (
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                          ⊘ Withdrawn by Student
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #6366f1', textTransform: 'capitalize' }}>
                          Current: {app.application_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {app.eligibility_snapshot && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => setSelectedSnapshot(app.eligibility_snapshot)}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          <FileCheck size={14} /> Verification Proof
                        </button>
                      )}

                      {!isWithdrawn && !isSelected && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleWithdraw(app.id, app.company_name)}
                          disabled={withdrawingId === app.id}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <XCircle size={13} />
                          <span>{withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recruitment Progress Stepper */}
                <div style={{
                  background: 'var(--bg-surface)',
                  padding: '1.25rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '0.5rem'
                }}>
                  {isWithdrawn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <XCircle size={16} color="#94a3b8" />
                      <span>Application withdrawn on your request. You can re-apply from the <strong>Available Drives</strong> catalog as long as the drive deadline is active.</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: '1rem' }}>
                        {stages.map((stage, sIdx) => {
                          const isPassed = !isRejected && sIdx <= currentIdx;
                          const isCurrent = !isRejected && sIdx === currentIdx;

                          return (
                            <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isPassed ? 'var(--primary)' : 'var(--bg-card)',
                                border: isCurrent ? '2px solid #a5b4fc' : '2px solid var(--border-medium)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                boxShadow: isCurrent ? '0 0 10px rgba(99, 102, 241, 0.6)' : 'none',
                                marginBottom: '0.4rem'
                              }}>
                                {isPassed ? '✓' : sIdx + 1}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: isCurrent ? 700 : 500,
                                color: isPassed ? '#ffffff' : 'var(--text-dim)',
                                textAlign: 'center'
                              }}>
                                {stage.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Informative Guidance on Active Stage */}
                      <div style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        background: isSelected 
                          ? 'rgba(16, 185, 129, 0.1)' 
                          : isRejected 
                            ? 'rgba(239, 68, 68, 0.08)' 
                            : 'rgba(99, 102, 241, 0.08)',
                        border: isSelected 
                          ? '1px solid #10b981' 
                          : isRejected 
                            ? '1px solid rgba(239, 68, 68, 0.3)' 
                            : '1px solid rgba(99, 102, 241, 0.2)',
                        color: isSelected ? '#6ee7b7' : isRejected ? '#fca5a5' : '#c7d2fe',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <CheckCircle2 size={16} color={isSelected ? '#34d399' : isRejected ? '#ef4444' : '#818cf8'} style={{ flexShrink: 0 }} />
                        <span>
                          {isSelected && '🎉 Congratulations! An official employment offer has been extended for this placement drive.'}
                          {isRejected && 'Recruitment process concluded. You were not shortlisted for subsequent rounds. Please explore other active campus opportunities.'}
                          {!isSelected && !isRejected && app.application_status === 'applied' && 'Application verified and submitted. Recruiter evaluation is currently underway.'}
                          {!isSelected && !isRejected && app.application_status === 'shortlisted' && '⭐ Your profile has been shortlisted! Prepare for the upcoming assessment or technical evaluation.'}
                          {!isSelected && !isRejected && app.application_status === 'assessment' && '📝 Online Assessment stage active. Check your registered email for exam links and instructions.'}
                          {!isSelected && !isRejected && app.application_status === 'technical_interview' && '💻 Technical Interview stage. Review your technical projects, core subjects, and coding portfolio.'}
                          {!isSelected && !isRejected && app.application_status === 'hr_interview' && '👔 HR Interview round. Prepare your personal, leadership, and situational communication.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Eligibility Snapshot Verification Proof Modal */}
      {selectedSnapshot && (
        <div className="modal-overlay" onClick={() => setSelectedSnapshot(null)}>
          <div className="modal-content modal-fixed-layout" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header-fixed">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color="#10b981" />
                  <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0 }}>Eligibility Snapshot at Application Time</h3>
                </div>
                <button onClick={() => setSelectedSnapshot(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem', marginBottom: 0 }}>
                This audit record preserves the certified institutional data values and rules verified at the exact moment of application submission.
              </p>
            </div>

            <div className="modal-scroll-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Array.isArray(selectedSnapshot) ? selectedSnapshot.map((c, i) => (
                  <div key={i} className="checklist-item passed" style={{ padding: '0.65rem 0.85rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required: {c.required}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>{c.actual}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Institutional Verified</div>
                    </div>
                  </div>
                )) : (
                  <pre style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#a5b4fc', overflowX: 'auto' }}>
                    {JSON.stringify(selectedSnapshot, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            <div className="modal-footer-fixed" style={{ textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedSnapshot(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
