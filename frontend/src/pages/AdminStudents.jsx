import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, ShieldCheck, ShieldAlert, Edit2, Lock, UserX, UserCheck, Eye, Mail } from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [message, setMessage] = useState(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    cgpa: '',
    tenth_percentage: '',
    twelfth_percentage: '',
    branch: '',
    active_backlogs: 0,
    backlog_history_count: 0,
    graduation_year: 2027,
    dob: '',
    email: '',
    mobile: '',
    reason: ''
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (branchFilter) queryParams.append('branch', branchFilter);
      if (verificationFilter) queryParams.append('verification', verificationFilter);

      const res = await api.getStudentsAdmin(queryParams.toString());
      setStudents(res.students || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Failed to load students.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [branchFilter, verificationFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleViewDetails = async (usn) => {
    try {
      const res = await api.getStudentDetailsAdmin(usn);
      setSelectedStudent(res);
    } catch (err) {
      alert(err.data?.error || 'Failed to fetch student details');
    }
  };

  const handleToggleBlock = async (usn, currentStatus) => {
    const nextStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const reason = prompt(`Enter reason for ${nextStatus === 'blocked' ? 'blocking' : 'unblocking'} student ${usn}:`);
    if (!reason) return;

    try {
      await api.updateStudentBlockStatus(usn, { status: nextStatus, reason });
      setMessage({ type: 'success', text: `Student ${usn} status updated to ${nextStatus}.` });
      fetchStudents();
      if (selectedStudent) {
        handleViewDetails(usn);
      }
    } catch (err) {
      alert(err.data?.error || 'Failed to update student status');
    }
  };

  const handleToggleVerification = async (usn, currentStatus) => {
    const nextStatus = currentStatus === 'VERIFIED' ? 'FLAGGED' : 'VERIFIED';
    try {
      await api.updateStudentVerification(usn, { verificationStatus: nextStatus });
      setMessage({ type: 'success', text: `Verification status for ${usn} set to ${nextStatus}.` });
      fetchStudents();
    } catch (err) {
      alert(err.data?.error || 'Failed to update verification status');
    }
  };

  const handleOpenEditRecord = (student) => {
    setEditingRecord(student);
    setEditFormData({
      cgpa: student.cgpa !== undefined ? student.cgpa : (student.academic?.cgpa || ''),
      tenth_percentage: student.tenth_percentage !== undefined ? student.tenth_percentage : (student.academic?.tenth_percentage || ''),
      twelfth_percentage: student.twelfth_percentage !== undefined ? student.twelfth_percentage : (student.academic?.twelfth_percentage || ''),
      branch: student.branch || student.academic?.branch || '',
      active_backlogs: student.active_backlogs !== undefined ? student.active_backlogs : (student.academic?.active_backlogs ?? 0),
      backlog_history_count: student.backlog_history_count !== undefined ? student.backlog_history_count : (student.academic?.backlog_history_count ?? 0),
      graduation_year: student.graduation_year || student.academic?.graduation_year || 2027,
      dob: student.dob || student.student?.dob || '',
      email: student.email || student.student?.email || '',
      mobile: student.mobile || student.student?.mobile || '',
      reason: ''
    });
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!editFormData.reason.trim()) {
      alert('Audit compliance requires a formal justification reason.');
      return;
    }

    try {
      await api.editVerifiedRecordAdmin(editingRecord.usn, editFormData);
      setMessage({ type: 'success', text: `Verified academic record for ${editingRecord.usn} modified and logged in audit.` });
      setEditingRecord(null);
      fetchStudents();
    } catch (err) {
      alert(err.data?.error || 'Failed to edit verified record');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.3rem' }}>Institutional Student Master Records</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Certified registrar academic database. Maintain institutional integrity, investigate flagged records, and manage placement access.
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

      {/* Filters & Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
            <input 
              className="form-input" 
              placeholder="Search by USN (e.g. 1MS21CS042) or student name..."
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
              value={branchFilter} 
              onChange={e => setBranchFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '130px' }}
            >
              <option value="">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="ISE">ISE</option>
              <option value="ECE">ECE</option>
              <option value="MECH">MECH</option>
            </select>

            <select 
              className="form-select" 
              value={verificationFilter} 
              onChange={e => setVerificationFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="FLAGGED">Flagged Discrepancies</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Records Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>USN</th>
              <th>Student Name</th>
              <th>Branch</th>
              <th>Certified CGPA</th>
              <th>10th / 12th %</th>
              <th>Backlogs</th>
              <th>Verification</th>
              <th>Account</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading student master records...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No students found matching current query.
                </td>
              </tr>
            ) : (
              students.map(s => (
                <tr key={s.id}>
                  <td>
                    <strong style={{ color: '#ffffff' }}>{s.usn}</strong>
                    {s.mismatch_count > 0 && (
                      <span title={`${s.mismatch_count} discrepancies detected`} style={{ marginLeft: 6, fontSize: '0.7rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
                        {s.mismatch_count} MISMATCH
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{s.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#818cf8' }}>{s.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      DOB: {s.dob || 'N/A'} {s.mobile ? `• 📞 ${s.mobile}` : ''}
                    </div>
                  </td>
                  <td><span style={{ fontWeight: 600 }}>{s.branch}</span></td>
                  <td>
                    <span style={{ fontWeight: 700, color: s.cgpa >= 7.5 ? '#34d399' : '#e2e8f0' }}>
                      {s.cgpa?.toFixed(2)}
                    </span>
                  </td>
                  <td>{s.tenth_percentage?.toFixed(1)}% / {s.twelfth_percentage?.toFixed(1)}%</td>
                  <td>
                    <span style={{ fontWeight: 700, color: s.active_backlogs > 0 ? '#f87171' : '#34d399' }}>
                      {s.active_backlogs}
                    </span>
                  </td>
                  <td>
                    <span 
                      className={`badge ${s.verification_status === 'VERIFIED' ? 'badge-verified' : s.verification_status === 'FLAGGED' ? 'badge-flagged' : 'badge-pending'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleVerification(s.usn, s.verification_status)}
                      title="Click to toggle status"
                    >
                      {s.verification_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.user_status === 'active' ? 'badge-verified' : 'badge-flagged'}`}>
                      {s.user_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleViewDetails(s.usn)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        title="View Student File"
                      >
                        <Eye size={13} />
                      </button>

                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleOpenEditRecord(s)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        title="Edit Verified Record (Audit Tracked)"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button 
                        className={`btn ${s.user_status === 'blocked' ? 'btn-success' : 'btn-danger'}`} 
                        onClick={() => handleToggleBlock(s.usn, s.user_status)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        title={s.user_status === 'blocked' ? 'Unblock Student' : 'Block Student from Applications'}
                      >
                        {s.user_status === 'blocked' ? <UserCheck size={13} /> : <UserX size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* STUDENT DETAILS INSPECTION MODAL */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={22} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: '1.35rem', color: '#ffffff' }}>
                    {selectedStudent.student.name} ({selectedStudent.student.usn})
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Institutional Placement Dossier & Verification Records
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Academic Summary Card */}
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Certified CGPA:</div>
                  <div style={{ fontWeight: 700, color: '#34d399', fontSize: '1.1rem' }}>{selectedStudent.academic?.cgpa?.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Branch:</div>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{selectedStudent.academic?.branch}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Active Backlogs:</div>
                  <div style={{ fontWeight: 700, color: selectedStudent.academic?.active_backlogs > 0 ? '#f87171' : '#ffffff' }}>
                    {selectedStudent.academic?.active_backlogs}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Verification:</div>
                  <span className={`badge ${selectedStudent.academic?.verification_status === 'VERIFIED' ? 'badge-verified' : 'badge-flagged'}`}>
                    {selectedStudent.academic?.verification_status}
                  </span>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Registered DOB:</div>
                  <div style={{ fontWeight: 600, color: '#38bdf8' }}>{selectedStudent.student?.dob || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Email Address:</div>
                  <div style={{ fontWeight: 600, color: '#818cf8', wordBreak: 'break-all' }}>{selectedStudent.student?.email || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Phone / Mobile:</div>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{selectedStudent.student?.mobile || 'Not set'}</div>
                </div>
              </div>
            </div>

            {/* Discrepancies (if any) */}
            {selectedStudent.mismatches?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <ShieldAlert size={16} /> Discrepancies Recorded Against This Student:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedStudent.mismatches.map((m, idx) => (
                    <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{m.field_name}:</strong> Claimed <span style={{ color: '#f87171' }}>{m.submitted_value}</span> vs Verified <span style={{ color: '#34d399' }}>{m.verified_value}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Source: {m.source} • Notes: {m.notes}</div>
                      </div>
                      <span className="badge badge-flagged">{m.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applications by Student */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.5rem' }}>Drive Applications ({selectedStudent.applications?.length || 0})</h4>
              {selectedStudent.applications?.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No applications submitted yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedStudent.applications.map(a => (
                    <div key={a.id} style={{ background: 'var(--bg-input)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{a.company_name}</strong> - {a.drive_title} (₹{a.ctc_lpa} LPA)
                      </div>
                      <span className="badge" style={{ background: '#1e1b4b', color: '#c7d2fe' }}>
                        {a.application_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  handleOpenEditRecord(selectedStudent);
                  setSelectedStudent(null);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit2 size={14} />
                Edit Record & Contact
              </button>
              <button 
                className={`btn ${selectedStudent.student.user_status === 'blocked' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => handleToggleBlock(selectedStudent.student.usn, selectedStudent.student.user_status)}
              >
                {selectedStudent.student.user_status === 'blocked' ? 'Unblock Student' : 'Block Student'}
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedStudent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VERIFIED RECORD MODAL (AUDIT TRACKED) */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>
                  Modify Verified Academic Record: {editingRecord.usn}
                </h3>
              </div>
              <button onClick={() => setEditingRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="lock-banner" style={{ marginBottom: '1rem' }}>
              <Lock size={16} color="#34d399" />
              <div>
                <strong>Audit Compliance Warning:</strong> Any edit to institutional verified data is recorded in 
                the immutable audit log with your administrative user ID, timestamp, and old vs new values.
              </div>
            </div>

            <form onSubmit={handleSaveRecord}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Certified CGPA</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.01" 
                    value={editFormData.cgpa} 
                    onChange={e => setEditFormData({ ...editFormData, cgpa: e.target.value })}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <input 
                    className="form-input" 
                    value={editFormData.branch} 
                    onChange={e => setEditFormData({ ...editFormData, branch: e.target.value })}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">10th %</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.1" 
                    value={editFormData.tenth_percentage} 
                    onChange={e => setEditFormData({ ...editFormData, tenth_percentage: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">12th %</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.1" 
                    value={editFormData.twelfth_percentage} 
                    onChange={e => setEditFormData({ ...editFormData, twelfth_percentage: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Active Backlogs Count</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    value={editFormData.active_backlogs} 
                    onChange={e => setEditFormData({ ...editFormData, active_backlogs: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Graduation Year</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    value={editFormData.graduation_year} 
                    onChange={e => setEditFormData({ ...editFormData, graduation_year: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Registered Date of Birth (DOB)</span>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 500 }}>Used for student portal sign-in</span>
                  </label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={editFormData.dob || ''} 
                    onChange={e => setEditFormData({ ...editFormData, dob: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={15} color="#818cf8" />
                    <span>Student Contact Details (Email & Phone Number)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Email Address *</label>
                      <input 
                        className="form-input" 
                        type="email" 
                        value={editFormData.email || ''} 
                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                        placeholder="student@gmail.com"
                        required 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Syncs student login & institutional profile</span>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone / Mobile Number</label>
                      <input 
                        className="form-input" 
                        type="tel" 
                        value={editFormData.mobile || ''} 
                        onChange={e => setEditFormData({ ...editFormData, mobile: e.target.value })}
                        placeholder="+91 9876543210" 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Used for placement notifications</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ color: '#f87171' }}>
                  Administrative Justification / Reason (Mandatory for Audit Trail) *
                </label>
                <textarea 
                  className="form-textarea" 
                  rows={2}
                  placeholder="e.g. Grade revaluation by VTU exam cell, official memo dated 10-Sept-2026"
                  value={editFormData.reason}
                  onChange={e => setEditFormData({ ...editFormData, reason: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Audit Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
