import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, GraduationCap, Building2, Calendar, User, Lock } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'staff'
  
  // Student Login fields
  const [studentUsn, setStudentUsn] = useState('');
  const [studentDob, setStudentDob] = useState('');

  // Staff Login fields
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ usn: studentUsn, dob: studentDob });
    } catch (err) {
      setError(err.data?.error || err.message || 'Student login failed. Check your USN and Date of Birth.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ identifier: staffIdentifier, password: staffPassword });
    } catch (err) {
      setError(err.data?.error || err.message || 'Login failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 70%)',
      padding: '2.5rem 1rem'
    }}>
      {/* Top Brand Header */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.85rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'var(--primary-gradient)',
          width: 46,
          height: 46,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.5)'
        }}>
          <ShieldCheck size={26} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            VeriPlace
            <span style={{ fontSize: '0.65rem', background: '#312e81', color: '#c7d2fe', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 700 }}>
              PORTAL ACCESS
            </span>
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Smart Placement Registration & Eligibility Verification Platform
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '460px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Role-Based Tabbed Login Form */}
        <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-accent)', boxShadow: 'var(--shadow-xl)' }}>
          
          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.3rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('student'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                background: activeTab === 'student' ? 'var(--primary-gradient)' : 'transparent',
                color: activeTab === 'student' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: activeTab === 'student' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <GraduationCap size={16} />
              Student Login
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('staff'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                background: activeTab === 'staff' ? 'var(--primary-gradient)' : 'transparent',
                color: activeTab === 'staff' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: activeTab === 'staff' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Building2 size={16} />
              Placement Officer / Recruiter
            </button>
          </div>

          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem', color: '#ffffff' }}>
            {activeTab === 'student' ? 'Student Sign In' : 'Placement Officer & Recruiter Sign In'}
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {activeTab === 'student'
              ? 'Enter your University Seat Number (USN) and registered Date of Birth.'
              : 'Enter your registered Placement Officer or Recruiter credentials.'}
          </p>

          {error && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              {error}
            </div>
          )}

          {/* Student Form (USN + DOB) */}
          {activeTab === 'student' && (
            <form onSubmit={handleStudentSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={14} color="var(--primary)" />
                  University Seat Number (USN) *
                </label>
                <input 
                  className="form-input" 
                  placeholder="4NI23IS164"
                  value={studentUsn}
                  onChange={e => setStudentUsn(e.target.value.toUpperCase().trim())}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'block' }}>
                  Institutional student identification number
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color="var(--primary)" />
                  Date of Birth (DOB) *
                </label>
                <input 
                  className="form-input" 
                  type="date"
                  value={studentDob}
                  onChange={e => setStudentDob(e.target.value)}
                  required
                  style={{ colorScheme: 'dark' }}
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'block' }}>
                  Select your birth date as registered with academic records
                </span>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.75rem' }}
              >
                <LogIn size={16} />
                <span>{loading ? 'Verifying Student...' : 'Sign In as Student'}</span>
              </button>
            </form>
          )}

          {/* Placement Officer / Recruiter Form (Email + Password) */}
          {activeTab === 'staff' && (
            <form onSubmit={handleStaffSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={14} color="var(--primary)" />
                  Placement Officer Email or Username *
                </label>
                <input 
                  className="form-input" 
                  placeholder="admin@gmail.com"
                  value={staffIdentifier}
                  onChange={e => setStaffIdentifier(e.target.value.trim())}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={14} color="var(--primary)" />
                  Password *
                </label>
                <input 
                  className="form-input" 
                  type="password"
                  placeholder="Enter password"
                  value={staffPassword}
                  onChange={e => setStaffPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.75rem' }}
              >
                <LogIn size={16} />
                <span>{loading ? 'Authenticating...' : 'Sign In as Placement Officer'}</span>
              </button>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Protected by institutional single-source verification. Authentication is strictly role-scoped.
          </div>
        </div>
      </div>
    </div>
  );
}
