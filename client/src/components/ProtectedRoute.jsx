import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOMES = {
  patient:        '/patient',
  hospital_admin: '/hospital-admin',
  system_admin:   '/admin',
  volunteer:      '/volunteer',
  paramedic:      '/ambulance',
};

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
    }
  }
  return children;
};

export default ProtectedRoute;
