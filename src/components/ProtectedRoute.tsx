import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: UserRole;
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but wrong role, redirect to their own dashboard
  if (userRole !== allowedRole) {
    return <Navigate to={`/${userRole}`} replace />;
  }

  // Correct role, allow access
  return <>{children}</>;
};

export default ProtectedRoute;
