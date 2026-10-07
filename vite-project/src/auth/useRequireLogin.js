import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from './context/CustomerAuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Returns `requireLogin()`: true when signed in; otherwise sends the visitor to the
 * sign-in page (returning here afterwards) and returns false.
 */
export const useRequireLogin = () => {
  const { isAuthenticated } = useCustomerAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  return (message = 'Please sign in to continue.') => {
    if (isAuthenticated) return true;
    showToast(message);
    navigate('/login', { state: { from: location.pathname + location.search } });
    return false;
  };
};
