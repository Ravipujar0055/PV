import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function EligibilityModal({ drive, onClose, onApply, onWithdraw, applying }) {
  if (!drive) return null;

  const eligibility = drive.eligibility;
  const isEligible = eligibility ? eligibility.isEligible : false;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content modal-fixed-layout" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '650px' }}
      >
        {/* FIXED HEADER: Company info, eligibility status, close button, drive title, and institutional verification note */}
        <div className="modal-header-fixed">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge" style={{ background: '#312e81', color: '#c7d2fe', fontWeight: 700 }}>
                  {drive.companyName}
                </span>
                {isEligible ? (
                  <span className="badge badge-eligible">✓ Eligible to Apply</span>
                ) : (
                  <span className="badge badge-ineligible">✕ Requirement Not Met</span>
                )}
              </div>
              <h2 style={{ fontSize: '1.35rem', color: '#ffffff', fontWeight: 800, margin: '0 0 0.2rem 0' }}>
                {drive.title}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                {drive.role} • ₹{drive.ctcLpa} LPA • {drive.location}
              </p>
            </div>
            <button 
              onClick={onClose}
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)', 
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem', 
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
              title="Close modal"
            >
              &times;
            </button>
          </div>

          {/* Verification Engine Notice */}
          <div className="lock-banner" style={{ marginBottom: '0.65rem', padding: '0.65rem 0.85rem' }}>
            <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.785rem', lineHeight: 1.35 }}>
              <strong>Institutional Deterministic Verification:</strong> Eligibility is calculated using your 
              institutionally verified records. Student-entered values cannot alter these criteria.
            </div>
          </div>

          <div style={{ 
            fontSize: '0.725rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            color: 'var(--text-dim)', 
            fontWeight: 700 
          }}>
            Institutional Requirement Checklist
          </div>
        </div>

        {/* SCROLLABLE BODY: ONLY THE CHECKLIST ITEMS & INPUTS SCROLL */}
        <div className="modal-scroll-body">
          {eligibility?.checks && eligibility.checks.length > 0 ? (
            eligibility.checks.map((c, i) => (
              <div key={i} className={`checklist-item ${c.passed ? 'passed' : 'failed'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {c.passed ? (
                    <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                  ) : (
                    <XCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Company Criteria: <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.required}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: c.passed ? '#34d399' : '#f87171' }}>
                    {c.actual}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Verified Value</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              All standard institutional criteria satisfied. No disqualification flags.
            </div>
          )}

          {/* Failed Reasons Alert if Ineligible */}
          {!isEligible && eligibility?.failedReasons?.length > 0 && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginTop: '1rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <AlertTriangle size={16} /> Disqualification Reasons:
              </div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#fca5a5' }}>
                {eligibility.failedReasons.map((reason, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Public Resume Drive Link Input if Eligible and not applied */}
          {isEligible && !drive.hasApplied && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginTop: '1rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8' }}>Public Resume Drive Link:</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Google Drive / Cloud URL)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Ensure link sharing is set to <strong>"Anyone with the link can view"</strong> so the recruiter can evaluate your CV.
              </p>
              <input 
                type="url"
                className="form-input"
                style={{ fontSize: '0.825rem', fontFamily: 'monospace' }}
                placeholder="https://drive.google.com/file/d/your-resume-link/view?usp=sharing"
                defaultValue={drive.savedResumeUrl || ''}
                id="modal-resume-url-input"
              />
            </div>
          )}
        </div>

        {/* FIXED FOOTER: Actions stay pinned at the bottom */}
        <div className="modal-footer-fixed">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            
            {drive.hasApplied ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" disabled>
                  Already Applied ({drive.applicationStatus})
                </button>
                {onWithdraw && (
                  <button 
                    className="btn btn-danger"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)'
                    }}
                    onClick={() => onWithdraw(drive.applicationId, drive.companyName)}
                    disabled={drive.applicationStatus === 'selected'}
                  >
                    Withdraw Application
                  </button>
                )}
              </div>
            ) : isEligible ? (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const input = document.getElementById('modal-resume-url-input');
                  const resumeUrl = input ? input.value.trim() : '';
                  onApply(drive.id, resumeUrl);
                }}
                disabled={applying}
              >
                {applying ? 'Submitting Application...' : 'Apply Now (Verified Eligible)'}
              </button>
            ) : (
              <button className="btn btn-danger" disabled style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                Apply Blocked (Ineligible)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
