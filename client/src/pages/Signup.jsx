import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button, Card, ErrorBanner, Input } from '../components/ui.jsx';
import { Logo, BRAND } from '../components/Brand.jsx';

export default function Signup() {
  const { session, loading, signUp } = useAuth();
  const [state, setState] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [awaitConfirm, setAwaitConfirm] = useState(false);

  if (!loading && session) return <Navigate to="/boards" replace />;

  function set(field) {
    return (e) => setState((s) => ({ ...s, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (state.password.length < 6) {
      setError('Password needs at least 6 characters');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signUp(state.email, state.password, state.fullName);
      if (result?.session) {
        window.location.href = '/boards';
        return;
      }
      setAwaitConfirm(true);
    } catch (err) {
      if (err?.message === 'User already registered') {
        setError('That email already has an account. Try signing in instead.');
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (awaitConfirm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
        <Card className="w-full max-w-sm p-8 text-center">
          <Logo size={52} className="mx-auto" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Almost there!</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            We sent a confirmation link to <span className="font-semibold text-slate-900">{state.email}</span>.
            Click it, then come back and sign in.
          </p>
          <div className="mt-5 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            No email? Check the spam folder, or ask the project owner to confirm your address.
          </div>
          <Button className="mt-5 w-full" onClick={() => window.location.assign('/login')}>
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Logo size={52} className="mx-auto" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">{BRAND.tagline}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={error} onClose={() => setError(null)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fullName">Your name</label>
            <Input id="fullName" value={state.fullName} onChange={set('fullName')} placeholder="Ada Lovelace" autoComplete="name" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
            <Input id="email" type="email" required value={state.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
            <Input id="password" type="password" required value={state.password} onChange={set('password')} placeholder="Pick at least 6 characters" autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
