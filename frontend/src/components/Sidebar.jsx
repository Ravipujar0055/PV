import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, UserCheck, FileText, 
  BarChart3, Users, Building, UploadCloud, ShieldAlert,
  ClipboardList, CheckCircle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { isAdmin, isRecruiter } = useAuth();

  const studentSections = [
    {
      title: 'Student Navigation',
      items: [
        { id: 'drives', label: 'Available Drives', icon: Briefcase },
        { id: 'profile', label: 'Verified Profile', icon: UserCheck },
        { id: 'applications', label: 'My Applications', icon: FileText }
      ]
    }
  ];

  const adminSections = [
    {
      title: 'Placement Administration',
      items: [
        { id: 'dashboard', label: 'Placement Dashboard', icon: BarChart3 }
      ]
    },
    {
      title: 'Talent & Drives',
      items: [
        { id: 'companies', label: 'Companies & Drives', icon: Building },
        { id: 'students', label: 'Student Master DB', icon: Users },
        { id: 'applications', label: 'All Applications', icon: ClipboardList }
      ]
    },
    {
      title: 'Integrity & Verification',
      items: [
        { id: 'mismatches', label: 'Fraud & Discrepancies', icon: ShieldAlert, badge: 'Audit', badgeType: 'alert' },
        { id: 'import', label: 'Forms & CSV Import', icon: UploadCloud },
        { id: 'audit', label: 'Immutable Audit Trail', icon: FileText }
      ]
    }
  ];

  const recruiterSections = [
    {
      title: 'Recruiter Portal',
      items: [
        { id: 'recruiter_dashboard', label: 'Recruiter Pipeline', icon: Building }
      ]
    }
  ];

  const sections = isAdmin ? adminSections : isRecruiter ? recruiterSections : studentSections;

  return (
    <aside className="sidebar">
      <div style={{ flex: 1, padding: '0.75rem 0.65rem', display: 'flex', flexDirection: 'column' }}>
        {sections.map((section, sIdx) => (
          <div key={section.title || sIdx} style={{ marginBottom: '0.35rem' }}>
            {sIdx > 0 && <div className="sidebar-section-divider" />}
            <div className="sidebar-section-label">
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                background: sIdx === 0 ? '#6366f1' : 'var(--text-dim)',
                boxShadow: sIdx === 0 ? '0 0 6px rgba(99, 102, 241, 0.6)' : 'none'
              }} />
              <span>{section.title}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {section.items.map(link => {
                const Icon = link.icon;
                const isActive = activeTab === link.id;

                return (
                  <button
                    key={link.id}
                    type="button"
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(link.id)}
                  >
                    <span className="nav-indicator" />
                    <Icon className="nav-icon" size={17} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {link.label}
                    </span>
                    {link.badge && (
                      <span className={`sidebar-badge ${link.badgeType || 'neutral'}`}>
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Institutional Guarantee Footer in Sidebar */}
      <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.15)' }}>
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.08)', 
          border: '1px solid rgba(16, 185, 129, 0.22)', 
          borderRadius: 'var(--radius-md)', 
          padding: '0.75rem 0.85rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#34d399', fontWeight: 700, fontSize: '0.75rem' }}>
              <span className="pulse-dot" />
              <span>Zero-Trust Active</span>
            </div>
            <span style={{ fontSize: '0.625rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
              VERIFIED
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
            Institutional academic master records are tamper-proof and verified server-side.
          </div>
        </div>
      </div>
    </aside>
  );
}
