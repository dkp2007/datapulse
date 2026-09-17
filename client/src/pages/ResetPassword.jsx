import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button, Card, ErrorBanner, Input } from '../components/ui.jsx';
import { Logo } from '../components/Brand.jsx';

export default function ResetPassword() {
  const { requestPasswordReset, updatePassword, recoveryActive } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSet(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      navigate('/boards');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (!recoveryActive) {
    body = (
      <form onSubmit={handleRequest} className="space-y-4">
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {done ? (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Check your inbox! If an account exists for {email}, we sent a link to pick a new password.
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
          </div>
        )}
        {!done && (
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a reset link'}
          </Button>
        )}
      </form>
    );
  } else {
    body = (
      <form onSubmit={handleSet} className="space-y-4">
        <ErrorBanner message={error} onClose={() => setError(null)} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">New password</label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="confirm">Type it again</label>
          <Input id="confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Same password again" autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Logo size={44} className="mx-auto" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-500">
            {recoveryActive ? 'Pick a new password below.' : "No problem — we'll email you a link."}
          </p>
        </div>
        {body}
        {!recoveryActive && (
          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
          </p>
        )}
      </Card>
    </div>
  );
}
