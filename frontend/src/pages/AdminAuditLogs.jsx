import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, ShieldCheck, Clock } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '150');
      if (actionFilter) params.append('action', actionFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (search) params.append('search', search);

      const res = await api.getAuditLogs(params.toString());
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span className="badge badge-verified">
            <ShieldCheck size={12} /> Cryptographic & Tamper-Resistant Log
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>Institutional Audit Trail</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Complete, chronological log of all authentication events, eligibility decisions, discrepancy detections, and administrative modifications.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
            <input 
              className="form-input" 
              placeholder="Search by action, USN, username, or entity..." 
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
              value={actionFilter} 
              onChange={e => setActionFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="">All Event Actions</option>
              <option value="DATA_MISMATCH_DETECTED">Data Mismatches</option>
              <option value="APPLICATION_SUBMITTED">Application Submitted</option>
              <option value="APPLICATION_REJECTED_INELIGIBLE">Ineligible Rejection</option>
              <option value="ACADEMIC_RECORD_MODIFIED_BY_ADMIN">Admin Record Edits</option>
              <option value="STUDENT_BLOCKED">Student Blocked</option>
              <option value="STUDENT_UNBLOCKED">Student Unblocked</option>
              <option value="COMPANY_DRIVE_CREATED">Drive Created</option>
              <option value="USER_LOGIN">User Logins</option>
            </select>

            <select 
              className="form-select" 
              value={roleFilter} 
              onChange={e => setRoleFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '130px' }}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="system">System</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Security Action</th>
              <th>Entity</th>
              <th>Audit Payload / Diff</th>
              <th>Network IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading audit stream...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No audit entries matching filter.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {log.created_at}
                    </div>
                  </td>
                  <td><strong style={{ color: '#ffffff' }}>{log.user_name || 'System'}</strong></td>
                  <td>
                    <span className="badge" style={{ 
                      background: log.role === 'admin' ? '#581c87' : log.role === 'student' ? '#1e3a8a' : '#14532d',
                      color: '#ffffff'
                    }}>
                      {log.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontWeight: 700, 
                      color: log.action.includes('MISMATCH') || log.action.includes('BLOCKED') || log.action.includes('REJECTED') ? '#f87171' : log.action.includes('CREATED') || log.action.includes('SUBMITTED') ? '#34d399' : '#a5b4fc'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                    </span>
                  </td>
                  <td style={{ maxWidth: '340px' }}>
                    {log.old_values && (
                      <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                        <span style={{ color: '#f87171' }}>Old:</span> {JSON.stringify(log.old_values)}
                      </div>
                    )}
                    {log.new_values && (
                      <div style={{ fontSize: '0.725rem', color: '#cbd5e1' }}>
                        <span style={{ color: '#34d399' }}>New:</span> {JSON.stringify(log.new_values)}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {log.ip_address}
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
