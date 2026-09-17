import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { Logo, BRAND } from './Brand.jsx';

function IconBoards() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0">
      <path d="M5 20v-8" />
      <path d="M12 20V5" />
      <path d="M19 20v-5" />
    </svg>
  );
}

function IconData() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M12 4v10" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

function IconSummary() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M4 5h16" />
      <path d="M4 12h10" />
      <path d="M4 19h13" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M16 12h.01" />
      <path d="M4 10h16" />
    </svg>
  );
}

function IconInvoice() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

function IconGst() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M9 3h6v3a3 3 0 0 1-6 0V3Z" />
      <path d="M12 9v4" />
      <path d="M8.5 21h7l-1-8h-5l-1 8Z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function IconOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function LanguageToggle({ className = '' }) {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={toggle}
      title="Switch language / भाषा बदलें"
      className={`rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
        className || 'text-slate-500 hover:bg-slate-100 hover:text-brand-700'
      }`}
    >
      {lang === 'en' ? 'हिं' : 'EN'}
    </button>
  );
}

export { LanguageToggle };

const items = [
  { to: '/boards', labelKey: 'boards', Icon: IconBoards },
  { to: '/analytics', labelKey: 'summary', Icon: IconSummary },
  { to: '/datasets', labelKey: 'myData', Icon: IconData },
  { to: '/invoices', labelKey: 'invoices', Icon: IconInvoice },
  { to: '/gst', labelKey: 'gst', Icon: IconGst },
  { to: '/documents', labelKey: 'wallet', Icon: IconWallet },
  { to: '/reports', labelKey: 'reports', Icon: IconReports },
  { to: '/settings', labelKey: 'settings', Icon: IconSettings },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <aside className="group/sidebar hidden h-screen w-[72px] shrink-0 flex-col justify-between overflow-hidden bg-white shadow-sm ring-1 ring-slate-100 transition-[width] duration-300 ease-out hover:w-[236px] hover:shadow-xl lg:flex">
      <div>
        <div className="flex h-16 items-center px-[22px]">
          <Logo size={28} className="shrink-0" />
          <span className="ml-3 whitespace-nowrap text-lg font-bold text-brand-800 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            {BRAND.name}
          </span>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {items.map(({ to, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={t(labelKey)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/20'
                    : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              <Icon />
              <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                {t(labelKey)}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-2 px-3">
          <LanguageToggle className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700" />
          {lang === 'hi' && (
            <p className="mt-1 whitespace-nowrap px-3 text-[10px] text-slate-300 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              और हिस्से जल्द आ रहे हैं
            </p>
          )}
        </div>
      </div>

      <div className="px-3 pb-5">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-1 py-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {(user?.email ?? '?')[0].toUpperCase()}
          </span>
          <span className="min-w-0 truncate whitespace-nowrap text-xs text-slate-500 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            {user?.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <IconOut />
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            {t('signOut')}
          </span>
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate('/login');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        title="Menu"
      >
        <IconMenu />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onMouseDown={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50 fade-in" />
          <aside
            className="absolute left-0 top-0 flex h-full w-[260px] flex-col justify-between bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Logo size={26} />
                  <span className="text-lg font-bold text-brand-800">{BRAND.name}</span>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <IconClose />
                </button>
              </div>
              <nav className="mt-2 flex flex-col gap-1 px-3">
                {items.map(({ to, labelKey, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                      }`
                    }
                  >
                    <Icon />
                    {t(labelKey)}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-2 px-3">
                <LanguageToggle className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-brand-50" />
              </div>
            </div>
            <div className="px-3 pb-5">
              <div className="mb-2 truncate px-1 text-xs text-slate-400">{user?.email}</div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <IconOut />
                {t('signOut')}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
