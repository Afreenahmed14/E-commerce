import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from './Loader';

/**
 * Gatekeeps a route subtree. If `roles` is provided, only those roles may
 * pass; everyone else is redirected. Unauthenticated users are sent to
 * /login with the attempted location preserved for post-login redirect.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullPage label="Checking your session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
