import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button, ErrorBanner, Input } from '../components/ui.jsx';
import { Logo, BRAND } from '../components/Brand.jsx';

function DecorPanel() {
  return (
    <div className="relative hidden w-[44%] max-w-lg flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-10 text-white lg:flex">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-300/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-white/10 p-1.5 backdrop-blur">
            <Logo size={40} className="rounded-xl" />
          </span>
          <div>
            <div className="text-xl font-bold">{BRAND.name}</div>
            <div className="text-xs text-brand-200">{BRAND.tagline}</div>
          </div>
        </div>
      </div>

      <div className="relative space-y-8">
        <h2 className="max-w-sm text-3xl font-bold leading-snug">
          Your whole business,
          <br />
          one clear picture.
        </h2>

        <div className="space-y-4">
          <div className="animate-float w-64 rounded-2xl bg-white/10 p-4 shadow-lg backdrop-blur">
            <div className="text-[10px] font-medium uppercase tracking-wider text-brand-200">Money made (₹)</div>
            <div className="mt-0.5 text-2xl font-bold">₹4,82,350</div>
            <div className="mt-3 flex items-end gap-1.5">
              {[38, 55, 44, 70, 62, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-white/30 to-white/90"
                  style={{ height: `${h * 0.4}px` }}
                />
              ))}
            </div>
          </div>

          <div className="animate-float-delayed ml-16 w-56 rounded-2xl bg-white/10 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium uppercase tracking-wider text-brand-200">This month</div>
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">▲ 12.4%</span>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-white/20">
                <div className="h-full w-[78%] rounded-full bg-emerald-300" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/20">
                <div className="h-full w-[52%] rounded-full bg-brand-300" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/20">
                <div className="h-full w-[64%] rounded-full bg-white/70" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div />
    </div>
  );
}

export default function Login() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/boards" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/boards');
    } catch (err) {
      if (err?.message === 'Email not confirmed') {
        setError(
          'This account has not been confirmed yet. If you just signed up, click the link we emailed you first.'
        );
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100">
      <DecorPanel />

      <div className="flex w-full flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <Logo size={60} className="mx-auto" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">{BRAND.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{BRAND.tagline}</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to see your boards.</p>
          </div>

          <form onSubmit={handleSubmit} className="animate-pop-in space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-brand-900/5 backdrop-blur sm:p-7">
            <ErrorBanner message={error} onClose={() => setError(null)} />

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                <Link to="/reset-password" className="text-xs font-medium text-brand-600 hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full py-2.5" disabled={busy}>
              {busy ? 'Signing you in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
              Create a free account
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-600">← Back to the home page</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
