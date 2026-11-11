import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import AuthCard from '../../components/AuthCard.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import PageTitle from '../../components/PageTitle.jsx';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext.jsx';
import { Input } from '../../components/Input.jsx';

const LoginForm = () => {
  const { hasToken, login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (the dashboard checks the saved token itself).
  if (hasToken && !submitting) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(username, password);
    if (result.ok) {
      navigate('/admin');
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      fullHeight
      decorated
      maxWidth="max-w-[420px]"
      onSubmit={handleSubmit}
      header={
        <div className="flex flex-col items-center gap-2">
          <Logo height={64} className="mb-1" />
          {/* The shop's own title lettering (gold gradient), as on its sign-in pages. */}
          <PageTitle size="xs" className="tracking-[0.1em]!">
            RAAVE&apos;S ADMIN
          </PageTitle>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-gold-400">
            Console sign-in
          </span>
        </div>
      }
    >
      <FormField label="Username" htmlFor="admin-user">
        <Input
          id="admin-user"
          required
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </FormField>

      <FormField label="Password" htmlFor="admin-pass">
        <Input
          id="admin-pass"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <FormError>{error}</FormError>

      <Button type="submit" className="mt-1" disabled={submitting}>
        <LogIn size={17} strokeWidth={2} />
        {submitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </AuthCard>
  );
};

const AdminLogin = () => {
  return (
    <AdminAuthProvider>
      <LoginForm />
    </AdminAuthProvider>
  );
};

export default AdminLogin;
