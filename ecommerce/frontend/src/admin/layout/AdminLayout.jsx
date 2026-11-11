import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import AdminSidebar from './AdminSidebar.jsx';
import AdminTopbar from './AdminTopbar.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import Button from '../../components/Button.jsx';
import ToastContainer from '../../layout/ToastContainer.jsx';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext.jsx';
import { AdminDataGate, AdminDataProvider } from '../context/AdminDataContext.jsx';

const AdminShell = () => {
  const { hasToken, checking, checkError, retryCheck } = useAdminAuth();

  if (!hasToken) return <Navigate to="/admin/login" replace />;
  if (checking) return <PageLoader label="Signing in" />;
  if (checkError) {
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-shade px-6 text-center">
        <p className="max-w-[420px] text-[0.92rem] text-text-secondary">{checkError}</p>
        <Button size="sm" onClick={retryCheck}>
          <RotateCw size={15} strokeWidth={2} />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <AdminDataProvider>
      <div className="flex min-h-screen bg-shade">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-5 md:p-8">
            <Suspense fallback={<PageLoader />}>
              <AdminDataGate>
                <Outlet />
              </AdminDataGate>
            </Suspense>
          </main>
        </div>
      </div>
      <ToastContainer />
    </AdminDataProvider>
  );
};

const AdminLayout = () => {
  return (
    <AdminAuthProvider>
      <AdminShell />
    </AdminAuthProvider>
  );
};

export default AdminLayout;
