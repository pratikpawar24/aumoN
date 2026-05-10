import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Login         from './components/Auth/Login';
import Register      from './components/Auth/Register';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Carpool requires both authentication AND a verified email.
const VerifiedRoute = ({ children }) => {
  const { isAuthenticated, emailVerified, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return children;
};

const AppRoutes = () => {
  const { loading } = useAuth();
  if (loading) return <FullPageLoader />;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />}         />
        <Route path="/map"       element={<MapPage />}      />
        <Route path="/about"     element={<AboutPage />}    />
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
        <Route path="*"          element={<Navigate to="/" replace />} />
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
