import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ShieldCheck, LogOut, Building2, GraduationCap, User, Mail, Phone, Edit2, CheckCircle2, Key } from 'lucide-react';

export default function Navbar() {
  const { user, logout, updateUserData } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  if (!user) return null;

  const handleOpenProfile = () => {
    setProfileUsername(user.username || '');
    setProfileEmail(user.email || '');
    setProfileName(user.name || user.username || '');
    setProfileMobile(user.mobile || '');
    setCurrentPassword('');
    setNewPassword('');
    setProfileMsg(null);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const payload = {
        email: profileEmail,
        name: profileName,
        mobile: profileMobile
      };

      if (user.role === 'admin' && profileUsername) {
        payload.username = profileUsername;
      }

      if (newPassword.trim()) {
        payload.newPassword = newPassword.trim();
        payload.currentPassword = currentPassword.trim();
      }

      const res = await api.updateUserProfile(payload);
      updateUserData({
        username: res.user.username,
        email: res.user.email,
        name: res.user.name,
        mobile: res.user.mobile
      });
      setProfileMsg({ type: 'success', text: 'Admin profile and credentials updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setShowProfileModal(false);
      }, 1500);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.data?.error || err.message || 'Failed to update admin profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
      {/* Main App Navbar */}
      <div style={{
        padding: '0.85rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'var(--primary-gradient)',
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              VeriPlace
              <span style={{ fontSize: '0.65rem', background: '#1e1b4b', color: '#818cf8', border: '1px solid #4338ca', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 700 }}>
                INSTITUTIONAL
              </span>
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Smart Placement Registration & Eligibility Verification System
            </div>
          </div>
        </div>

        {/* Current Logged-in User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            onClick={handleOpenProfile}
            style={{ 
              textAlign: 'right', 
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 0.2s'
            }}
            title="Click to edit contact info (Email & Phone)"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
              <span>{user.name || user.username}</span>
              <Edit2 size={12} color="#818cf8" />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
              {user.email && <span style={{ color: '#a5b4fc', fontSize: '0.7rem' }}>{user.email}</span>}
              {user.email && <span>•</span>}
              <span style={{ 
                textTransform: 'uppercase', 
                fontWeight: 700, 
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 4,
                background: user.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : user.role === 'recruiter' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                color: user.role === 'admin' ? '#c084fc' : user.role === 'recruiter' ? '#38bdf8' : '#34d399',
                border: `1px solid ${user.role === 'admin' ? 'rgba(168, 85, 247, 0.3)' : user.role === 'recruiter' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`
              }}>
                {user.role}
              </span>
            </div>
          </div>

          <div 
            onClick={handleOpenProfile}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: user.role === 'admin' ? '#c084fc' : user.role === 'recruiter' ? '#38bdf8' : '#34d399'
            }}
            title="Edit profile & contact details"
          >
            {user.role === 'admin' ? <ShieldCheck size={18} /> : user.role === 'recruiter' ? <Building2 size={18} /> : <GraduationCap size={18} />}
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={logout}
            title="Logout from system"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* USER / ADMIN PROFILE EDIT MODAL */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff', margin: 0 }}>
                  {user.role === 'admin' ? 'Placement Officer / Admin Profile' : 'Personal Details & Contact'}
                </h3>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {profileMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                background: profileMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${profileMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: profileMsg.type === 'success' ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {profileMsg.type === 'success' && <CheckCircle2 size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {user.role === 'admin' ? (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={13} color="var(--primary)" />
                    Admin Sign-In Username *
                  </label>
                  <input 
                    className="form-input" 
                    value={profileUsername} 
                    onChange={e => setProfileUsername(e.target.value.trim().toLowerCase())}
                    required 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Used on the Placement Officer / Recruiter login tab</span>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Username / Account ID</label>
                  <input 
                    className="form-input" 
                    value={user.username} 
                    disabled 
                    style={{ opacity: 0.6, cursor: 'not-allowed' }} 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Permanent system account identifier</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={13} color="var(--primary)" />
                  Full Name
                </label>
                <input 
                  className="form-input" 
                  value={profileName} 
                  onChange={e => setProfileName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={13} color="var(--primary)" />
                  Email Address *
                </label>
                <input 
                  className="form-input" 
                  type="email" 
                  value={profileEmail} 
                  onChange={e => setProfileEmail(e.target.value)} 
                  required 
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Used for placement communication & account sign-in</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={13} color="var(--primary)" />
                  Phone / Mobile Number
                </label>
                <input 
                  className="form-input" 
                  type="tel" 
                  value={profileMobile} 
                  onChange={e => setProfileMobile(e.target.value)} 
                  placeholder="+91 9876543210" 
                />
              </div>

              {user.role === 'admin' && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Key size={14} color="#818cf8" />
                    <span>Change Admin Password (Optional)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Password</label>
                      <input 
                        className="form-input" 
                        type="password" 
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Current password" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>New Password (min 6 chars)</label>
                      <input 
                        className="form-input" 
                        type="password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Leave empty to keep current" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile & Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
