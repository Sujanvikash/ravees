import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from './context/CustomerAuthContext.jsx';

export default function RequireCustomer({ children }) {
  const { isAuthenticated } = useCustomerAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
