import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { TesterDashboardPage } from './pages/TesterDashboardPage';
import { DeveloperDashboardPage } from './pages/DeveloperDashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { IssuesPage } from './pages/IssuesPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { IssueDetailsPage } from './pages/IssueDetailsPage';
import { GitHubIntegrationPage } from './pages/GitHubIntegrationPage';
import { TeamManagementPage } from './pages/TeamManagementPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSpinner } from './components/LoadingSpinner';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner text="Authenticating user session..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Role-Specific Dashboards */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tester"
                element={
                  <ProtectedRoute allowedRoles={['TESTER', 'ADMIN']}>
                    <TesterDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="developer"
                element={
                  <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
                    <DeveloperDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Projects */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailsPage />} />

              {/* Issues & AI Bug Management */}
              <Route path="issues" element={<IssuesPage />} />
              <Route path="issues/create" element={<CreateIssuePage />} />
              <Route path="issues/:id" element={<IssueDetailsPage />} />

              {/* GitHub, Team, Profile, Settings */}
              <Route path="github" element={<GitHubIntegrationPage />} />
              <Route path="team" element={<TeamManagementPage />} />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
