import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MapProvider }           from './context/MapContext';
import { ThemeProvider }         from './context/ThemeContext';
import ErrorBoundary             from './components/Common/ErrorBoundary';
import Navbar                    from './components/Common/Navbar';
import { FullPageLoader }        from './components/Common/Loading';
import { TOAST_OPTIONS }         from './utils/constants';

import Home          from './pages/Home';
import MapPage       from './pages/MapPage';
import CarpoolPage   from './pages/CarpoolPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage   from './pages/ProfilePage';
import AboutPage     from './pages/AboutPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PrivacyPage     from './pages/PrivacyPage';
import TermsPage       from './pages/TermsPage';
import Login         from './components/Auth/Login';
import Register      from './components/Auth/Register';

import AdminLayout      from './components/Admin/AdminLayout';
import AdminOverview    from './pages/admin/AdminOverview';
import AdminUsers       from './pages/admin/AdminUsers';
import AdminUserDetail  from './pages/admin/AdminUserDetail';
import AdminAdmins      from './pages/admin/AdminAdmins';
import AdminActivity    from './pages/admin/AdminActivity';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const VerifiedRoute = ({ children }) => {
  const { isAuthenticated, emailVerified, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

const MasterAdminRoute = ({ children }) => {
  const { isMasterAdmin, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isMasterAdmin) return <Navigate to="/admin" replace />;
  return children;
};

const ConditionalNavbar = () => {
  const location = useLocation();
  // Admin console has its own chrome — hide the user-facing navbar there.
  if (location.pathname.startsWith('/admin')) return null;
  return <Navbar />;
};

const AppRoutes = () => {
  const { loading } = useAuth();
  if (loading) return <FullPageLoader />;

  return (
    <>
      <ConditionalNavbar />
      <Routes>
        <Route path="/"          element={<Home />}         />
        <Route path="/map"       element={<MapPage />}      />
        <Route path="/about"     element={<AboutPage />}    />
        <Route path="/privacy"   element={<PrivacyPage />}  />
        <Route path="/terms"     element={<TermsPage />}    />
        <Route path="/login"     element={<Login />}        />
        <Route path="/register"  element={<Register />}     />
        <Route path="/verify-email" element={
          <ProtectedRoute><VerifyEmailPage /></ProtectedRoute>
        } />
        <Route path="/carpool"   element={
          <VerifiedRoute><CarpoolPage /></VerifiedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/profile"   element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        {/* Admin console — separate layout, separate chrome */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index           element={<AdminOverview />} />
          <Route path="users"    element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="admins"   element={<MasterAdminRoute><AdminAdmins /></MasterAdminRoute>} />
          <Route path="activity" element={<MasterAdminRoute><AdminActivity /></MasterAdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <MapProvider>
          <Router>
            <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
            <AppRoutes />
          </Router>
        </MapProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
