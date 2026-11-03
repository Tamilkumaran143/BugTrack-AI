import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AppErrorBoundary } from './components/AppErrorBoundary';

const LoginPage = React.lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const TesterDashboardPage = React.lazy(() => import('./pages/TesterDashboardPage').then((module) => ({ default: module.TesterDashboardPage })));
const DeveloperDashboardPage = React.lazy(() => import('./pages/DeveloperDashboardPage').then((module) => ({ default: module.DeveloperDashboardPage })));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailsPage = React.lazy(() => import('./pages/ProjectDetailsPage').then((module) => ({ default: module.ProjectDetailsPage })));
const IssuesPage = React.lazy(() => import('./pages/IssuesPage').then((module) => ({ default: module.IssuesPage })));
const CreateIssuePage = React.lazy(() => import('./pages/CreateIssuePage').then((module) => ({ default: module.CreateIssuePage })));
const IssueDetailsPage = React.lazy(() => import('./pages/IssueDetailsPage').then((module) => ({ default: module.IssueDetailsPage })));
const GitHubIntegrationPage = React.lazy(() => import('./pages/GitHubIntegrationPage').then((module) => ({ default: module.GitHubIntegrationPage })));
const TeamManagementPage = React.lazy(() => import('./pages/TeamManagementPage').then((module) => ({ default: module.TeamManagementPage })));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage').then((module) => ({ default: module.UserProfilePage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

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
    <AppErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthProvider>
            <React.Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner text="Loading page..." />
              </div>
            }>
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
              <Route
                path="issues/create"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'TESTER']}>
                    <CreateIssuePage />
                  </ProtectedRoute>
                }
              />
              <Route path="issues/:id" element={<IssueDetailsPage />} />

              {/* GitHub, Team, Profile, Settings */}
              <Route path="github" element={<GitHubIntegrationPage />} />
              <Route
                path="team"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <TeamManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </React.Suspense>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
