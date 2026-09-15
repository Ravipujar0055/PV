import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CheckCircle2, UserX, UserCheck, Search } from 'lucide-react';

export default function AdminMismatches() {
  const [mismatches, setMismatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  const fetchMismatches = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (severityFilter) queryParams.append('severity', severityFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (search) queryParams.append('search', search);

      const res = await api.getMismatchesAdmin(queryParams.toString());
      setMismatches(res.mismatches || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Failed to fetch discrepancies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMismatches();
  }, [severityFilter, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMismatches();
  };

  const handleToggleBlock = async (usn, currentStatus) => {
    const nextStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const reason = prompt(`Reason for ${nextStatus === 'blocked' ? 'blocking' : 'unblocking'} student ${usn}:`);
    if (!reason) return;

    try {
      await api.updateStudentBlockStatus(usn, { status: nextStatus, reason });
      setMessage({ type: 'success', text: `Student ${usn} status set to ${nextStatus}.` });
      fetchMismatches();
    } catch (err) {
      alert(err.data?.error || 'Failed to update student block status');
    }
  };

  const handleResolve = async (id, resolutionStatus) => {
    const notes = prompt(`Administrative notes for marking as ${resolutionStatus}:`);
    if (!notes) return;

    try {
      await api.resolveMismatch(id, { resolutionStatus, resolutionNotes: notes });
      setMessage({ type: 'success', text: `Discrepancy record updated.` });
      fetchMismatches();
    } catch (err) {
      alert(err.data?.error || 'Failed to resolve mismatch');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span className="badge badge-flagged">Discrepancy Investigation Center</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>
          Detected Academic Data Mismatches & Fraud Flags
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Identified divergences between student-submitted forms and the verified institutional academic master database.
        </p>
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

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
            <input 
              className="form-input" 
              placeholder="Search by USN, student name, or field..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1rem' }}>
              <Search size={16} />
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select 
              className="form-select" 
              value={severityFilter} 
              onChange={e => setSeverityFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value="">All Severities</option>
              <option value="HIGH">High Severity (CGPA/Backlogs)</option>
              <option value="MEDIUM">Medium Severity (Marks/Gap)</option>
            </select>

            <select 
              className="form-select" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value="">All Statuses</option>
              <option value="flagged">Flagged</option>
              <option value="pending_review">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="penalized">Penalized</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mismatches Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Detected Timestamp</th>
              <th>Student USN</th>
              <th>Student Name</th>
              <th>Field</th>
              <th>Student Submitted</th>
              <th>Institutional Verified</th>
              <th>Discrepancy Source</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Student Access</th>
              <th>Administrative Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading discrepancies...
                </td>
              </tr>
            ) : mismatches.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No academic discrepancies found matching criteria.
                </td>
              </tr>
            ) : (
              mismatches.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {m.created_at?.split(' ')[0]}<br />{m.created_at?.split(' ')[1] || ''}
                  </td>
                  <td><strong style={{ color: '#ffffff' }}>{m.usn}</strong></td>
                  <td>{m.student_name || 'Student'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: m.severity === 'HIGH' ? '#f87171' : '#fbbf24' }}>
                      {m.field_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#f87171', fontWeight: 700 }}>
                      {m.submitted_value}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>
                      {m.verified_value}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {m.source.replace('_', ' ')}
                  </td>
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
                  <td>
                    <span className={`badge ${m.user_status === 'blocked' ? 'badge-flagged' : 'badge-verified'}`}>
                      {m.user_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        className={`btn ${m.user_status === 'blocked' ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => handleToggleBlock(m.usn, m.user_status)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        title={m.user_status === 'blocked' ? 'Unblock Student' : 'Block Student from Applications'}
                      >
                        {m.user_status === 'blocked' ? <UserCheck size={12} /> : <UserX size={12} />}
                      </button>

                      {m.status !== 'resolved' && (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => handleResolve(m.id, 'resolved')}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Mark as Resolved"
                        >
                          <CheckCircle2 size={12} color="#34d399" />
                        </button>
                      )}
                    </div>
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
