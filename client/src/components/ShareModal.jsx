import { useEffect, useState } from 'react';
import { sharing } from '../lib/api.js';
import { Button, ErrorBanner, Input, Modal, Select } from './ui.jsx';
import { useConfirm } from './Confirm.jsx';
import { useToast } from './Toast.jsx';

export default function ShareModal({ open, onClose, dashboard }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [share, setShare] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !dashboard) return;
    setError(null);
    sharing.listMembers(dashboard.id).then(setMembers).catch((e) => setError(e.message));
    sharing.getShare(dashboard.id).then(setShare).catch(() => setShare(null));
  }, [open, dashboard?.id]);

  if (!open || !dashboard) return null;

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sharing.inviteMember(dashboard.id, inviteEmail, canEdit);
      setInviteEmail('');
      toast("Invitation saved. They'll see this board after signing up with that email.");
      setMembers(await sharing.listMembers(dashboard.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(m) {
    const ok = await confirm({
      tone: 'danger',
      title: 'Remove this person?',
      message: `${m.member_email} will no longer see this board.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    await sharing.removeMember(m.id);
    setMembers(await sharing.listMembers(dashboard.id));
  }

  async function handleCreateLink() {
    setBusy(true);
    setError(null);
    try {
      const s = await sharing.createShare(dashboard.id);
      setShare(s);
      toast('Link created. Anyone with it can view this board.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeLink() {
    const ok = await confirm({
      tone: 'danger',
      title: 'Turn off the link?',
      message: 'Anyone who has it will no longer be able to open the board.',
      confirmLabel: 'Turn it off',
    });
    if (!ok) return;
    await sharing.revokeShare(share.id);
    setShare(null);
    toast('Link turned off.');
  }

  const link = share ? `${window.location.origin}/share/${share.token}` : null;

  return (
    <Modal open={open} onClose={onClose} title={`Share "${dashboard.name}"`} wide>
      <div className="space-y-6">
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div>
          <h4 className="mb-2 font-semibold text-slate-800">Invite your team</h4>
          <p className="mb-3 text-xs text-slate-400">
            They must sign up with this exact email to see the board.
          </p>
          <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
            />
            <Select value={canEdit ? 'edit' : 'view'} onChange={(e) => setCanEdit(e.target.value === 'edit')} className="sm:w-40">
              <option value="view">Can look</option>
              <option value="edit">Can change</option>
            </Select>
            <Button type="submit" disabled={busy}>Invite</Button>
          </form>

          {members.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{m.member_email}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      {m.can_edit ? 'CAN CHANGE' : 'CAN LOOK'}
                    </span>
                    <button onClick={() => handleRemoveMember(m)} className="text-slate-300 hover:text-red-500" title="Remove">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h4 className="mb-2 font-semibold text-slate-800">Anyone with the link</h4>
          <p className="mb-3 text-xs text-slate-400">
            A read-only page — perfect for investors or clients. No account needed, and you can turn it off any time.
          </p>
          {link ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2">
                <input readOnly value={link} className="w-full bg-transparent text-xs text-slate-600 focus:outline-none" />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast('Link copied.');
                  }}
                >
                  Copy
                </Button>
              </div>
              <button onClick={handleRevokeLink} className="text-xs font-medium text-red-500 hover:underline">
                Turn off this link
              </button>
            </div>
          ) : (
            <Button variant="secondary" onClick={handleCreateLink} disabled={busy}>
              🔗 Create public link
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
