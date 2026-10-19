import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FullScreenLoader } from '../components/ui';

// Renders the nested routes only for a verified session with an allowed role.
// Everyone else lands on the login page (the fallback), which explains why.
const ProtectedRoute = ({ roles }) => {
  const { status, role } = useAuth();
  const location = useLocation();
  const from = location.pathname + location.search;

  if (status === 'loading') {
    return <FullScreenLoader />;
  }

  if (status !== 'authenticated') {
    return <Navigate to={`/login?${new URLSearchParams({ reason: 'auth', from })}`} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={`/login?${new URLSearchParams({ reason: 'denied', from })}`} replace />;
  }

  return <Outlet />;
};

// Unknown URLs also fall back to the login page
export const NotFoundRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/login?${new URLSearchParams({ reason: 'notfound', from: location.pathname })}`} replace />;
};

export default ProtectedRoute;
