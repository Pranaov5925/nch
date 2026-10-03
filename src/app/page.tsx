'use client';

// NCH 3.0 — SPA mount point.
// The whole application is a client-side SPA (HashRouter) mounted at "/" so
// the preview panel (which serves this single route) can access every screen
// refresh-safely. API routes under /api/* are real Next.js server endpoints.
// NOTE: HashRouter is browser-only — SSR renders a loading shell and the
// router mounts after hydration (avoids `document is not defined`).

import { useSyncExternalStore } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/context/AuthContext';

// Public pages
import LandingPage from '@/components/nch/pages/public/LandingPage';
import LoginPage from '@/components/nch/pages/public/LoginPage';
import RegisterPage from '@/components/nch/pages/public/RegisterPage';
import PublicTrackPage from '@/components/nch/pages/public/TrackPage';

// Consumer pages
import ConsumerDashboard from '@/components/nch/pages/consumer/ConsumerDashboard';
import MyComplaints from '@/components/nch/pages/consumer/MyComplaints';
import ComplaintDetail from '@/components/nch/pages/consumer/ComplaintDetail';
import RegisterGrievance from '@/components/nch/pages/consumer/RegisterGrievance';
import SubmissionConfirmation from '@/components/nch/pages/consumer/SubmissionConfirmation';
import DocumentsPage from '@/components/nch/pages/consumer/DocumentsPage';
import NotificationsPage from '@/components/nch/pages/consumer/NotificationsPage';

// Officer pages
import OfficerDashboard from '@/components/nch/pages/officer/OfficerDashboard';
import OfficerQueue from '@/components/nch/pages/officer/OfficerQueue';
import OfficerComplaintDetail from '@/components/nch/pages/officer/OfficerComplaintDetail';
import OfficerEscalations from '@/components/nch/pages/officer/OfficerEscalations';
import OfficerFollowups from '@/components/nch/pages/officer/OfficerFollowups';
import OfficerAnalytics from '@/components/nch/pages/officer/OfficerAnalytics';

// Supervisor pages
import SupervisorDashboard from '@/components/nch/pages/supervisor/SupervisorDashboard';
import SupervisorComplaints from '@/components/nch/pages/supervisor/SupervisorComplaints';
import SupervisorEscalations from '@/components/nch/pages/supervisor/SupervisorEscalations';
import SupervisorAnalytics from '@/components/nch/pages/supervisor/SupervisorAnalytics';
import SupervisorCompanies from '@/components/nch/pages/supervisor/SupervisorCompanies';
import SupervisorReports from '@/components/nch/pages/supervisor/SupervisorReports';

// Company pages
import CompanyDashboard from '@/components/nch/pages/company/CompanyDashboard';
import CompanyComplaints from '@/components/nch/pages/company/CompanyComplaints';
import CompanyComplaintResponse from '@/components/nch/pages/company/CompanyComplaintResponse';
import CompanyResponses from '@/components/nch/pages/company/CompanyResponses';

// Shared
import ProfilePage from '@/components/nch/pages/shared/ProfilePage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="nch-root h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login/:roleSlug" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/success" element={<SubmissionConfirmation />} />
      <Route path="/track" element={<PublicTrackPage />} />

      {/* Consumer routes */}
      <Route path="/consumer/dashboard" element={<ProtectedRoute roles={['consumer']}><ConsumerDashboard /></ProtectedRoute>} />
      <Route path="/consumer/complaints" element={<ProtectedRoute roles={['consumer']}><MyComplaints /></ProtectedRoute>} />
      <Route path="/consumer/complaints/:id" element={<ProtectedRoute roles={['consumer']}><ComplaintDetail /></ProtectedRoute>} />
      <Route path="/consumer/register" element={<ProtectedRoute roles={['consumer']}><RegisterGrievance /></ProtectedRoute>} />
      <Route path="/consumer/register/confirmation" element={<ProtectedRoute roles={['consumer']}><SubmissionConfirmation /></ProtectedRoute>} />
      <Route path="/consumer/track" element={<ProtectedRoute roles={['consumer']}><PublicTrackPage /></ProtectedRoute>} />
      <Route path="/consumer/documents" element={<ProtectedRoute roles={['consumer']}><DocumentsPage /></ProtectedRoute>} />
      <Route path="/consumer/notifications" element={<ProtectedRoute roles={['consumer']}><NotificationsPage /></ProtectedRoute>} />
      {/* Notifications are a per-user API — the same page serves every role. */}
      <Route path="/officer/notifications" element={<ProtectedRoute roles={['officer']}><NotificationsPage /></ProtectedRoute>} />
      <Route path="/supervisor/notifications" element={<ProtectedRoute roles={['supervisor']}><NotificationsPage /></ProtectedRoute>} />
      <Route path="/company/notifications" element={<ProtectedRoute roles={['company']}><NotificationsPage /></ProtectedRoute>} />
      <Route path="/consumer/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Officer routes (supervisors may open case files) */}
      <Route path="/officer/dashboard" element={<ProtectedRoute roles={['officer']}><OfficerDashboard /></ProtectedRoute>} />
      <Route path="/officer/queue" element={<ProtectedRoute roles={['officer']}><OfficerQueue /></ProtectedRoute>} />
      <Route path="/officer/complaints/:id" element={<ProtectedRoute roles={['officer', 'supervisor']}><OfficerComplaintDetail /></ProtectedRoute>} />
      <Route path="/officer/escalations" element={<ProtectedRoute roles={['officer']}><OfficerEscalations /></ProtectedRoute>} />
      <Route path="/officer/followups" element={<ProtectedRoute roles={['officer']}><OfficerFollowups /></ProtectedRoute>} />
      <Route path="/officer/analytics" element={<ProtectedRoute roles={['officer']}><OfficerAnalytics /></ProtectedRoute>} />
      <Route path="/officer/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Supervisor routes */}
      <Route path="/supervisor/dashboard" element={<ProtectedRoute roles={['supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
      <Route path="/supervisor/complaints" element={<ProtectedRoute roles={['supervisor']}><SupervisorComplaints /></ProtectedRoute>} />
      <Route path="/supervisor/escalations" element={<ProtectedRoute roles={['supervisor']}><SupervisorEscalations /></ProtectedRoute>} />
      <Route path="/supervisor/analytics" element={<ProtectedRoute roles={['supervisor']}><SupervisorAnalytics /></ProtectedRoute>} />
      <Route path="/supervisor/companies" element={<ProtectedRoute roles={['supervisor']}><SupervisorCompanies /></ProtectedRoute>} />
      <Route path="/supervisor/reports" element={<ProtectedRoute roles={['supervisor']}><SupervisorReports /></ProtectedRoute>} />
      <Route path="/supervisor/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Company routes */}
      <Route path="/company/dashboard" element={<ProtectedRoute roles={['company']}><CompanyDashboard /></ProtectedRoute>} />
      <Route path="/company/complaints" element={<ProtectedRoute roles={['company']}><CompanyComplaints /></ProtectedRoute>} />
      <Route path="/company/complaints/:id" element={<ProtectedRoute roles={['company']}><CompanyComplaintResponse /></ProtectedRoute>} />
      <Route path="/company/responses" element={<ProtectedRoute roles={['company']}><CompanyResponses /></ProtectedRoute>} />
      <Route path="/company/history" element={<ProtectedRoute roles={['company']}><CompanyComplaints /></ProtectedRoute>} />
      <Route path="/company/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Catch-all: redirect based on role */}
      <Route
        path="*"
        element={
          isLoading ? (
            <div className="nch-root h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>
          ) : user ? (
            <Navigate to={ROLE_HOME[user.role]} replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

const emptySubscribe = () => () => {};

export default function Home() {
  // Hydration-safe browser detection: false on the server, true on the client.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div className="nch-root h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        Loading National Consumer Helpline…
      </div>
    );
  }

  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
