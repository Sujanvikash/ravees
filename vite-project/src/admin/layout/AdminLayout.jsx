import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar.jsx';
import AdminTopbar from './AdminTopbar.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import ToastContainer from '../../layout/ToastContainer.jsx';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext.jsx';
import { AdminDataProvider } from '../context/AdminDataContext.jsx';

function AdminShell() {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  return (
    <AdminDataProvider>
      <div className="flex min-h-screen bg-[#04120a]">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-5 md:p-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <ToastContainer />
    </AdminDataProvider>
  );
}

export default function AdminLayout() {
  return (
    <AdminAuthProvider>
      <AdminShell />
    </AdminAuthProvider>
  );
}
