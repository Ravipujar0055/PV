import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, ShieldAlert, Zap, Send } from 'lucide-react';

export default function GoogleFormSimulator() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    usn: user?.usn || '4NI23IS164',
    name: user?.name || 'Ravi Annappa Pujar',
    email: 'ravipujar8073@gmail.com',
    dob: user?.dob || '2005-03-23',
    branch: 'ISE',
    cgpa: '9.52',
    activeBacklogs: '0',
    historyOfBacklogs: '0',
    tenthPercentage: '94.4',
    twelfthPercentage: '93',
    graduationYear: '2027',
    projectTitle: '',
    workExperience: '0'
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const fillHonestData = () => {
    setFormData({
      usn: '4NI23IS164',
      name: 'Ravi Annappa Pujar',
      email: 'ravipujar8073@gmail.com',
      dob: '2005-03-23',
      branch: 'ISE',
      cgpa: '9.52',
      activeBacklogs: '0',
      historyOfBacklogs: '0',
      tenthPercentage: '94.4',
      twelfthPercentage: '93',
      graduationYear: '2027',
      projectTitle: 'Distributed Microservices Broker',
      workExperience: '0'
    });
    setResult(null);
  };

  const fillFraudulentData = () => {
    setFormData({
      usn: '4NI23IS164',
      name: 'Ravi Annappa Pujar',
      email: 'ravipujar8073@gmail.com',
      dob: '2003-08-22',
      branch: 'ISE',
      cgpa: '5.20', // FAKE: inflated from 6.80!
      activeBacklogs: '5', // FAKE: concealed 1 active backlog!
      historyOfBacklogs: '3', // FAKE: concealed backlog history!
      tenthPercentage: '42.0',
      twelfthPercentage: '48.5',
      graduationYear: '2027',
      projectTitle: 'Campus Event Portal',
      workExperience: '2'
    });
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = [
        {
          USN: formData.usn,
          'Candidate Name': formData.name,
          'Primary Email': formData.email,
          'Date of Birth (DOB)': formData.dob,
          'Date of Birth': formData.dob,
          DOB: formData.dob,
          dob: formData.dob,
          'Branch': formData.branch,
          'CGPA': parseFloat(formData.cgpa),
          'Active Backlogs': parseInt(formData.activeBacklogs, 10),
          'History Of Backlogs': parseInt(formData.historyOfBacklogs, 10),
          '10th Percentage': parseFloat(formData.tenthPercentage),
          '12th Percentage': parseFloat(formData.twelfthPercentage),
          'Graduation Year': parseInt(formData.graduationYear, 10),
          'Project Title': formData.projectTitle
        }
      ];

      const res = await api.importGoogleForms(payload);
      setResult(res.results);
    } catch (err) {
      console.error(err);
      alert(err.data?.error || 'Failed to submit simulated form response.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span className="badge" style={{ background: '#701a75', color: '#f5d0fe' }}>
            Interactive Test Sandbox
          </span>
          <span className="badge badge-flagged">
            Section 8, 15 & 25 Requirement
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>
          Google Form Placement Registration Simulator
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Test how the institutional verification engine reconciles unverified Google Form responses.
          When students submit false academic figures, the system detects discrepancies, flags the record, and notifies administrators.
        </p>
      </div>

      {/* Quick Test Presets */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#c7d2fe', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={18} color="#a5b4fc" /> 1-Click Simulation Scenarios:
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={fillFraudulentData}
            style={{ fontSize: '0.85rem' }}
          >
            ⚠️ Load Critical Fraud Test (Rahul Sharma: 6.80 CGPA claiming 8.20)
          </button>

          <button
            type="button"
            className="btn btn-success"
            onClick={fillHonestData}
            style={{ fontSize: '0.85rem' }}
          >
            ✓ Load Honest Submission (Aarav Patel: matches verified DB)
          </button>
        </div>
      </div>

      {/* Simulated Google Form Box */}
      <div className="card" style={{ border: '1px solid #6366f1', position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 6, background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)', margin: '-1.5rem -1.5rem 1.5rem' }} />

        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '0.3rem' }}>
            Placement Drive Registration Form (Campus 2026-27)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Google Form entry simulation. All academic entries submitted here will be cross-referenced with institutional verified registry.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Student USN *</label>
              <input
                className="form-input"
                value={formData.usn}
                onChange={e => setFormData({ ...formData, usn: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Student Name *</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-input"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth (DOB) *</label>
              <input
                className="form-input"
                type="date"
                value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                required
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch *</label>
              <input
                className="form-input"
                value={formData.branch}
                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <label className="form-label" style={{ color: '#fca5a5' }}>
                Self-Reported CGPA (Academic Field) *
              </label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={formData.cgpa}
                onChange={e => setFormData({ ...formData, cgpa: e.target.value })}
                required
                style={{ fontWeight: 700, borderColor: '#ef4444' }}
              />
              <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.25rem' }}>
                * Target of discrepancy check against verified DB
              </div>
            </div>

            <div className="form-group" style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <label className="form-label" style={{ color: '#fca5a5' }}>
                Self-Reported Active Backlogs *
              </label>
              <input
                className="form-input"
                type="number"
                value={formData.activeBacklogs}
                onChange={e => setFormData({ ...formData, activeBacklogs: e.target.value })}
                required
                style={{ fontWeight: 700, borderColor: '#ef4444' }}
              />
              <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.25rem' }}>
                * Target of backlog concealment check
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">10th Percentage</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={formData.tenthPercentage}
                onChange={e => setFormData({ ...formData, tenthPercentage: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">12th Percentage</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={formData.twelfthPercentage}
                onChange={e => setFormData({ ...formData, twelfthPercentage: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '0.75rem 1.75rem' }}
            >
              <Send size={16} />
              <span>{submitting ? 'Reconciling with Master DB...' : 'Submit to Placement Office'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* LIVE RECONCILIATION RESULT REPORT */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          {result.mismatchesDetected > 0 ? (
            <div className="card" style={{ border: '2px solid #ef4444', background: '#181119' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <ShieldAlert size={28} color="#ef4444" />
                <div>
                  <h3 style={{ color: '#ef4444', fontSize: '1.3rem' }}>
                    DATA MISMATCH DETECTED — RECORD FLAGGED!
                  </h3>
                  <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                    Institutional Verification Engine caught discrepancies between student submission and registrar records.
                  </div>
                </div>
              </div>

              {/* Mismatch Items Table */}
              <div className="table-container" style={{ marginBottom: '1.25rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>USN</th>
                      <th>Academic Field</th>
                      <th>Student Submitted</th>
                      <th>Institutional Verified</th>
                      <th>Discrepancy Severity</th>
                      <th>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.discrepancyDetails.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong style={{ color: '#ffffff' }}>{item.usn}</strong></td>
                        <td style={{ fontWeight: 600 }}>{item.fieldName}</td>
                        <td style={{ color: '#f87171', fontWeight: 700 }}>{item.submittedValue}</td>
                        <td style={{ color: '#34d399', fontWeight: 700 }}>{item.verifiedValue}</td>
                        <td>
                          <span className="badge badge-flagged">{item.severity}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#450a0a', color: '#fca5a5' }}>
                            Logged in Audit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '0.9rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem', color: '#fca5a5' }}>
                <strong>Institutional Rule Enforced:</strong> The student's claimed value has been <strong>rejected</strong>.
                The verified institutional record was NOT altered. Placement eligibility for ABC Technologies and other companies
                will continue to use the certified institutional values.
              </div>
            </div>
          ) : (
            <div className="card" style={{ border: '2px solid #10b981', background: '#0a1d17' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={28} color="#10b981" />
                <div>
                  <h3 style={{ color: '#34d399', fontSize: '1.3rem' }}>
                    100% RECONCILIATION VERIFIED — NO MISMATCHES
                  </h3>
                  <div style={{ color: '#a7f3d0', fontSize: '0.85rem' }}>
                    All submitted fields matched the institutional master database. Record status remains clean.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
