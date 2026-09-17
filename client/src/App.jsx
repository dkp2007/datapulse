import { useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import { useLanguage } from './contexts/LanguageContext.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import { Button, Card, Spinner } from './components/ui.jsx';
import { Logo, BRAND } from './components/Brand.jsx';
import Sidebar, { MobileSidebar, LanguageToggle } from './components/Sidebar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import DashboardList from './pages/DashboardList.jsx';
import DashboardView from './pages/DashboardView.jsx';
import DatasetList from './pages/DatasetList.jsx';
import ImportWizard from './pages/ImportWizard.jsx';
import DataEditor from './pages/DataEditor.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import DocumentWallet from './pages/DocumentWallet.jsx';
import Invoices from './pages/Invoices.jsx';
import GstSummary from './pages/GstSummary.jsx';
import PublicBoard from './pages/PublicBoard.jsx';

function usePageTitle() {
  const location = useLocation();
  useEffect(() => {
    const p = location.pathname;
    let title = `Boards · ${BRAND.name}`;
    if (p === '/') title = `${BRAND.name} — ${BRAND.tagline}`;
    else if (p.startsWith('/login')) title = `Sign in · ${BRAND.name}`;
    else if (p.startsWith('/signup')) title = `Create account · ${BRAND.name}`;
    else if (p.startsWith('/reset')) title = `New password · ${BRAND.name}`;
    else if (p.startsWith('/share')) title = `Shared board · ${BRAND.name}`;
    else if (p.startsWith('/datasets/import')) title = `Add data · ${BRAND.name}`;
    else if (p.startsWith('/datasets/edit')) title = `Edit data · ${BRAND.name}`;
    else if (p.startsWith('/datasets/new')) title = `Type data in · ${BRAND.name}`;
    else if (p.startsWith('/datasets')) title = `My data · ${BRAND.name}`;
    else if (p.startsWith('/analytics')) title = `Analytics · ${BRAND.name}`;
    else if (p.startsWith('/documents')) title = `Document wallet · ${BRAND.name}`;
    else if (p.startsWith('/invoices')) title = `Invoices · ${BRAND.name}`;
    else if (p.startsWith('/gst')) title = `GST summary · ${BRAND.name}`;
    else if (p.startsWith('/settings')) title = `Settings · ${BRAND.name}`;
    else if (p.startsWith('/reports')) title = `Reports · ${BRAND.name}`;
    else if (p.startsWith('/dashboards')) title = `Board · ${BRAND.name}`;
    document.title = title;
  }, [location]);
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (!supabaseConfigured) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <Logo size={44} className="mx-auto" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">One quick setup step</h1>
          <p className="mt-2 text-sm text-slate-500">
            The app needs two keys to connect to your account. Open the file{' '}
            <code className="rounded bg-slate-100 px-1">client/.env.local</code>, add{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code>, then start the app again.
          </p>
        </Card>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function MobileBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="sticky top-0 z-20 border-b border-brand-100 bg-white lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <MobileSidebar />
        <Link to="/boards" className="flex items-center gap-2">
          <Logo size={26} />
          <span className="font-bold text-brand-800">{BRAND.name}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <LanguageToggle />
          <button
            onClick={handleSignOut}
            title={user?.email}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            {t('signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  usePageTitle();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/share/:token" element={<PublicBoard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="*"
        element={
          <RequireAuth>
            <div className="flex h-full">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <MobileBar />
                <div className="mx-auto max-w-7xl px-4 py-6">
                  <Routes>
                    <Route path="/boards" element={<DashboardList />} />
                    <Route path="/dashboards/:id" element={<DashboardView />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/datasets" element={<DatasetList />} />
                    <Route path="/datasets/import" element={<ImportWizard />} />
                    <Route path="/datasets/new" element={<DataEditor />} />
                    <Route path="/datasets/edit/:id" element={<DataEditor />} />
                    <Route path="/documents" element={<DocumentWallet />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/gst" element={<GstSummary />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/" element={<Navigate to="/boards" replace />} />
                    <Route path="*" element={<Navigate to="/boards" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
