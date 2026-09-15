import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, UserCheck, FileText, 
  BarChart3, Users, Building, UploadCloud, ShieldAlert,
  ClipboardList, CheckCircle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { isAdmin, isRecruiter } = useAuth();

  const studentLinks = [
    { id: 'drives', label: 'Available Drives', icon: Briefcase },
    { id: 'profile', label: 'Verified Profile', icon: UserCheck },
    { id: 'applications', label: 'My Applications', icon: FileText }
  ];

  const adminLinks = [
    { id: 'dashboard', label: 'Placement Dashboard', icon: BarChart3 },
    { id: 'companies', label: 'Companies & Drives', icon: Building },
    { id: 'students', label: 'Student Master DB', icon: Users },
    { id: 'mismatches', label: 'Fraud & Discrepancies', icon: ShieldAlert },
    { id: 'import', label: 'Forms & CSV Import', icon: UploadCloud },
    { id: 'applications', label: 'All Applications', icon: ClipboardList },
    { id: 'audit', label: 'Immutable Audit Trail', icon: FileText }
  ];

  const recruiterLinks = [
    { id: 'recruiter_dashboard', label: 'Recruiter Pipeline', icon: Building }
  ];

  const links = isAdmin ? adminLinks : isRecruiter ? recruiterLinks : studentLinks;

  return (
    <aside className="sidebar">
      <div style={{ padding: '1.25rem 1rem 0.5rem' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', fontWeight: 700, paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
          {isAdmin ? 'Placement Administration' : isRecruiter ? 'Recruiter Portal' : 'Student Navigation'}
        </div>
      </div>

      <nav style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {links.map(link => {
          const Icon = link.icon;
          const isActive = activeTab === link.id;

          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-surface)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={18} color={isActive ? '#818cf8' : 'currentColor'} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Institutional Guarantee Footer in Sidebar */}
      <div style={{ marginTop: 'auto', padding: '1.25rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.2rem' }}>
            <CheckCircle size={14} /> Zero-Trust Verified
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
            Institutional academic master records are locked and validated server-side.
          </div>
        </div>
      </div>
    </aside>
  );
}
