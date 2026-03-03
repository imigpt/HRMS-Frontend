import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkflowRedirect() {
  const { isAuthenticated, userRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={`/${userRole}/workflow`} replace />;
}
