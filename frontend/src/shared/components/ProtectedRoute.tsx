import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  return isAuthenticated && !!token ? <>{children}</> : <Navigate to="/login" replace />;
}
