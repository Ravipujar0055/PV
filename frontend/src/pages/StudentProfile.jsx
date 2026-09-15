import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ShieldCheck, Lock, Plus, Trash2, CheckCircle2, Link2, ExternalLink, Globe, Check } from 'lucide-react';

export default function StudentProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeDriveLink, setResumeDriveLink] = useState('');
  const [savingResumeLink, setSavingResumeLink] = useState(false);
  const [message, setMessage] = useState(null);

  // Editable Contact Details states (Email & Phone Number ONLY)
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Form states for editable sections
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [newCert, setNewCert] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getStudentProfile();
      setProfileData(res);
      setProjects(res.profile?.projects || []);
      setSkills(res.profile?.skills || []);
      setCertifications(res.profile?.certifications || []);
      setResumeDriveLink(res.profile?.resumeUrl || res.profile?.resumePath || '');
      setContactEmail(res.personal?.email || '');
      setContactMobile(res.personal?.mobile || '');
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Failed to load student profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContactInfo = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = contactEmail.trim();
    const cleanMobile = contactMobile.trim();
    if (!cleanEmail) {
      setMessage({ type: 'danger', text: 'Email address cannot be blank.' });
      return;
    }
    try {
      setSavingContact(true);
      setMessage(null);
      const res = await api.updateStudentContact({
        email: cleanEmail,
        mobile: cleanMobile
      });
      setMessage({ type: 'success', text: res.message || 'Personal contact details updated successfully!' });
      fetchProfile();
    } catch (err) {
      setMessage({ type: 'danger', text: err.data?.error || err.message || 'Failed to update contact details.' });
    } finally {
      setSavingContact(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveResumeLink = async (e) => {
    if (e) e.preventDefault();
    const cleanLink = resumeDriveLink.trim();
    if (!cleanLink) {
      setMessage({ type: 'danger', text: 'Please enter a valid Google Drive or cloud URL for your resume.' });
      return;
    }
    if (!cleanLink.toLowerCase().startsWith('http://') && !cleanLink.toLowerCase().startsWith('https://')) {
      setMessage({ type: 'danger', text: 'Drive URL must start with http:// or https:// (e.g., https://drive.google.com/...)' });
      return;
    }

    try {
      setSavingResumeLink(true);
      const res = await api.updateResumeLink(cleanLink);
      setMessage({ type: 'success', text: res.message || 'Public resume drive link saved successfully!' });
      fetchProfile();
    } catch (err) {
      setMessage({ type: 'danger', text: err.data?.error || err.message || 'Failed to save resume drive link.' });
    } finally {
      setSavingResumeLink(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const res = await api.updateStudentProfile({
        projects,
        skills,
        certifications
      });
      setMessage({ type: 'success', text: res.message });
    } catch (err) {
      setMessage({ type: 'danger', text: err.data?.error || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const addProject = () => {
    setProjects([
      ...projects,
      { title: '', tech: '', description: '', link: '' }
    ]);
  };

  const updateProject = (index, field, value) => {
    const updated = [...projects];
    updated[index][field] = value;
    setProjects(updated);
  };

  const removeProject = (index) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const addSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (!skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const addCertification = (e) => {
    e.preventDefault();
    if (!newCert.trim()) return;
    if (!certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
    }
    setNewCert('');
  };

  const removeCertification = (certToRemove) => {
    setCertifications(certifications.filter(c => c !== certToRemove));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading institutional profile...</div>;
  }

  const personal = profileData?.personal;
  const verified = profileData?.verifiedAcademic;

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.3rem' }}>Student Academic & Career Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Your verified institutional records and career portfolio for campus placements.
        </p>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          color: message.type === 'success' ? '#34d399' : '#f87171',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* SECTION 1: INSTITUTIONAL VERIFIED ACADEMIC INFORMATION (LOCKED) */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Verified Academic Information</h2>
                <span className="badge badge-verified">
                  <CheckCircle2 size={12} /> Verified by Institution
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Certified by Registrar Office • Direct Single Source of Truth
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <Lock size={14} /> Tamper-Proof Locked
          </div>
        </div>

        {/* Lock Banner */}
        <div className="lock-banner" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
          <Lock size={16} color="#34d399" />
          <div>
            <strong>Institutional Security Rule:</strong> Academic metrics (CGPA, marks, branch, backlogs) 
            are locked. Students cannot modify these fields. Placement eligibility is determined strictly using these certified values.
          </div>
        </div>

        {/* Verified Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">University Seat Number (USN)</label>
            <input className="form-input" value={personal?.usn || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Cumulative CGPA (Scale of 10)</label>
            <input className="form-input" style={{ fontWeight: 700, color: '#34d399' }} value={verified?.cgpa?.toFixed(2) || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Academic Branch / Discipline</label>
            <input className="form-input" value={verified?.branch || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Degree & Program</label>
            <input className="form-input" value={verified?.degree || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Active Backlogs Count</label>
            <input 
              className="form-input" 
              style={{ fontWeight: 700, color: verified?.active_backlogs > 0 ? '#f87171' : '#34d399' }}
              value={verified?.active_backlogs ?? ''} 
              disabled 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Backlog History Count</label>
            <input className="form-input" value={verified?.backlog_history_count ?? ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">10th Percentage</label>
            <input className="form-input" value={verified?.tenth_percentage ? `${verified.tenth_percentage.toFixed(1)}% (${verified.tenth_year})` : ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">12th / Diploma Percentage</label>
            <input className="form-input" value={verified?.twelfth_percentage ? `${verified.twelfth_percentage.toFixed(1)}% (${verified.twelfth_year})` : ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Graduation Passing Year</label>
            <input className="form-input" value={verified?.graduation_year || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Education Gap (Months)</label>
            <input className="form-input" value={verified?.education_gap_months !== undefined ? `${verified.education_gap_months} months` : ''} disabled />
          </div>
        </div>

        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right' }}>
          Verified by: <strong style={{ color: '#e2e8f0' }}>{verified?.verified_by || 'Placement Cell'}</strong> on {verified?.verified_at?.split(' ')[0] || 'Orientation'}
        </div>
      </div>

      {/* SECTION 2: PERSONAL DETAILS */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Personal Information & Contact Details</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Certified institutional identity with student-editable contact details (email & phone number only).
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveContactInfo}
            disabled={savingContact}
            style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem' }}
          >
            <Check size={15} />
            <span>{savingContact ? 'Saving...' : 'Save Contact Details'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Full Name</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Locked</span>
            </label>
            <input className="form-input" value={personal?.name || ''} readOnly style={{ opacity: 0.85 }} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>University Seat Number (USN)</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Locked</span>
            </label>
            <input className="form-input" value={personal?.usn || ''} readOnly style={{ opacity: 0.85 }} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Registered Date of Birth (DOB)</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Locked</span>
            </label>
            <input className="form-input" style={{ fontWeight: 600, color: '#38bdf8', opacity: 0.85 }} value={personal?.dob || ''} readOnly />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gender</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Locked</span>
            </label>
            <input className="form-input" value={personal?.gender || ''} readOnly style={{ opacity: 0.85 }} />
          </div>

          {/* EDITABLE FIELD 1: Email Address */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Email Address *</span>
              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>✓ Editable</span>
            </label>
            <input 
              className="form-input" 
              type="email"
              value={contactEmail} 
              onChange={e => setContactEmail(e.target.value)} 
              placeholder="e.g. student@gmail.com"
              required
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
              Primary contact email for recruitment drive notifications
            </span>
          </div>

          {/* EDITABLE FIELD 2: Phone / Mobile Number */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Phone / Mobile Number</span>
              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>✓ Editable</span>
            </label>
            <input 
              className="form-input" 
              type="tel"
              value={contactMobile} 
              onChange={e => setContactMobile(e.target.value)} 
              placeholder="e.g. +91 9876543210"
              style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
              Mobile number shared with corporate recruiters
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: PUBLIC RESUME DRIVE LINK */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} color="#38bdf8" />
              Public Resume Drive Link
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Public cloud link (Google Drive, OneDrive, Dropbox) reviewed by recruiters
            </div>
          </div>
          {profileData?.profile?.resumeUrl && (
            <a 
              href={profileData.profile.resumeUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              <ExternalLink size={15} /> Open Saved Resume Link
            </a>
          )}
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '1.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            color: '#bae6fd',
            fontSize: '0.85rem'
          }}>
            <Link2 size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#ffffff' }}>Google Drive / Cloud Share Link:</strong> Paste a direct public sharing link to your resume PDF. Make sure your link permissions are set to <strong>"Anyone with the link can view"</strong> so recruiters and companies can access your profile.
            </div>
          </div>

          <form onSubmit={handleSaveResumeLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem', display: 'block' }}>
                Public Resume URL (Google Drive / Cloud URL)
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input 
                  type="url"
                  className="form-input"
                  style={{ flex: 1, minWidth: '280px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  placeholder="https://drive.google.com/file/d/your-resume-file-id/view?usp=sharing"
                  value={resumeDriveLink}
                  onChange={e => setResumeDriveLink(e.target.value)}
                  required
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={savingResumeLink}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem' }}
                >
                  <Check size={16} />
                  <span>{savingResumeLink ? 'Saving...' : 'Save Drive Link'}</span>
                </button>
                {resumeDriveLink.trim().startsWith('http') && (
                  <a 
                    href={resumeDriveLink.trim()} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem' }}
                  >
                    <ExternalLink size={15} />
                    <span>Test Link</span>
                  </a>
                )}
              </div>
            </div>

            {profileData?.profile?.resumeUrl ? (
              <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#34d399" />
                <span>Currently active resume link: <strong>{profileData.profile.resumeUrl}</strong></span>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No public resume link saved yet. Please paste your Google Drive link and click "Save Drive Link".
              </div>
            )}
          </form>
        </div>
      </div>

      {/* SECTION 4: STUDENT EDITABLE CAREER DETAILS (PROJECTS, SKILLS, CERTS) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Technical Skills & Certifications</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Showcase your stack and achievements to recruiters</div>
          </div>
        </div>

        {/* Skills Tag Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Core Technical Skills</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {skills.map(s => (
              <span key={s} style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {s}
                <button 
                  onClick={() => removeSkill(s)} 
                  style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>          <form onSubmit={addSkill} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
            <input 
              className="form-input" 
              placeholder="e.g. React, Node.js, Python" 
              value={newSkill} 
              onChange={e => setNewSkill(e.target.value)} 
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 0.85rem' }}>
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* Certifications Input */}
        <div>
          <label className="form-label">Professional Certifications</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {certifications.map(c => (
              <span key={c} style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#7dd3fc',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {c}
                <button 
                  onClick={() => removeCertification(c)} 
                  style={{ background: 'none', border: 'none', color: '#7dd3fc', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={addCertification} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
            <input 
              className="form-input" 
              placeholder="e.g. AWS Solutions Architect" 
              value={newCert} 
              onChange={e => setNewCert(e.target.value)} 
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 0.85rem' }}>
              <Plus size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 5: PROJECTS */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Technical Projects</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Projects submitted for recruitment evaluation</div>
          </div>
          <button className="btn btn-secondary" onClick={addProject} style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}>
            <Plus size={16} /> Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No projects listed. Click "Add Project" to showcase your practical work.
          </div>
        ) : (
          projects.map((p, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1rem',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#818cf8' }}>Project #{idx + 1}</span>
                <button 
                  onClick={() => removeProject(idx)}
                  className="btn btn-danger"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label">Project Title</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. Distributed Task Broker" 
                    value={p.title} 
                    onChange={e => updateProject(idx, 'title', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="form-label">Technologies Used</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. React, Node.js, MySQL" 
                    value={p.tech} 
                    onChange={e => updateProject(idx, 'tech', e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Brief Description & Impact</label>
                <textarea 
                  className="form-textarea" 
                  rows={2}
                  placeholder="Brief description of your project, architecture and results..." 
                  value={p.description} 
                  onChange={e => updateProject(idx, 'description', e.target.value)} 
                />
              </div>
            </div>
          ))
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Career Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
