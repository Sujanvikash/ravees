import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn, Info } from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import AuthCard from '../../components/AuthCard.jsx';
import FormError from '../../components/FormError.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import {
  AdminAuthProvider,
  DEMO_CREDENTIALS,
  useAdminAuth,
} from '../context/AdminAuthContext.jsx';
import { Input } from '../../components/Input.jsx';

function LoginForm() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (result.ok) navigate('/admin');
    else setError(result.error);
  };

  return (
    <AuthCard
      fullHeight
      maxWidth="max-w-[420px]"
      onSubmit={handleSubmit}
      header={
        <div className="flex flex-col items-center gap-2">
          <Logo size={44} glow={16} />
          <h1 className="font-serif text-[1.3rem] font-bold tracking-[0.14em] text-white">
            RAAVE&apos;S ADMIN
          </h1>
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
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </FormField>

      <FormField label="Password" htmlFor="admin-pass">
        <Input
          id="admin-pass"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <FormError>{error}</FormError>

      <Button type="submit" className="mt-1">
        <LogIn size={17} strokeWidth={2} />
        Sign In
      </Button>

      <div className="flex gap-2.5 rounded-lg border border-gold-400/15 bg-gold-400/8 p-3.5">
        <Info size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-300" />
        <p className="text-[0.78rem] leading-[1.6] text-text-secondary">
          Demo credentials — <code className="font-mono text-gold-200">{DEMO_CREDENTIALS.username}</code> /{' '}
          <code className="font-mono text-gold-200">{DEMO_CREDENTIALS.password}</code>. This gate is
          client-side only and is not real security.
        </p>
      </div>
    </AuthCard>
  );
}

export default function AdminLogin() {
  return (
    <AdminAuthProvider>
      <LoginForm />
    </AdminAuthProvider>
  );
}
