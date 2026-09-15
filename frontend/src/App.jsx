import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentApplications from './pages/StudentApplications';
import GoogleFormSimulator from './pages/GoogleFormSimulator';

import AdminDashboard from './pages/AdminDashboard';
import AdminCompanies from './pages/AdminCompanies';
import AdminStudents from './pages/AdminStudents';
import AdminMismatches from './pages/AdminMismatches';
import AdminImport from './pages/AdminImport';
import AdminApplications from './pages/AdminApplications';
import AdminAuditLogs from './pages/AdminAuditLogs';

import RecruiterDashboard from './pages/RecruiterDashboard';

export default function App() {
  const { user, loading, isAuthenticated, isAdmin, isStudent, isRecruiter } = useAuth();
  const [activeTab, setActiveTab] = useState('drives');

  // Set default tab on role switch
  useEffect(() => {
    if (isAdmin) {
      setActiveTab('dashboard');
    } else if (isRecruiter) {
      setActiveTab('recruiter_dashboard');
    } else if (isStudent) {
      setActiveTab('drives');
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: '#a5b4fc',
        fontSize: '1.1rem'
      }}>
        Initializing Institutional Verification Portal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    // Student Views
    if (isStudent) {
      switch (activeTab) {
        case 'drives':
          return <StudentDashboard onNavigate={setActiveTab} />;
        case 'profile':
          return <StudentProfile />;
        case 'applications':
          return <StudentApplications />;
        case 'google_form_sim':
          return <GoogleFormSimulator />;
        default:
          return <StudentDashboard onNavigate={setActiveTab} />;
      }
    }

    // Admin Views
    if (isAdmin) {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setActiveTab} />;
        case 'companies':
          return <AdminCompanies />;
        case 'students':
          return <AdminStudents />;
        case 'mismatches':
          return <AdminMismatches />;
        case 'import':
          return <AdminImport />;
        case 'applications':
          return <AdminApplications />;
        case 'audit':
          return <AdminAuditLogs />;
        default:
          return <AdminDashboard onNavigate={setActiveTab} />;
      }
    }

    // Recruiter Views
    if (isRecruiter) {
      return <RecruiterDashboard />;
    }

    return <div>Role not recognized.</div>;
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-layout">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="content-area">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
