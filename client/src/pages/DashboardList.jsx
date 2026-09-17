import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboards } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button, Card, EmptyState, ErrorBanner, Input, Modal, Spinner } from '../components/ui.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';

export default function DashboardList() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await dashboards.list();
    if (err) setError(err.message);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (modal.mode === 'create') {
        await dashboards.create({ name: name.trim(), description: description.trim() || null });
      } else {
        await dashboards.update(modal.item.id, { name: name.trim(), description: description.trim() || null });
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item) {
    const ok = await confirm({
      tone: 'danger',
      title: 'Remove this board?',
      message: `"${item.name}" and every tile on it will be gone for good.`,
      confirmLabel: 'Yes, remove it',
    });
    if (!ok) return;
    try {
      await dashboards.remove(item.id);
      toast('Board removed.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your boards</h1>
          <p className="text-sm text-slate-500">Pin up the numbers you care about — all in one place.</p>
        </div>
        <Button
          onClick={() => {
            setName('');
            setDescription('');
            setModal({ mode: 'create' });
          }}
        >
          + New board
        </Button>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📌"
          title="No boards yet"
          hint="A board is your own wall of charts and big numbers. Make one, add your files, and start watching what matters."
          action={<Button onClick={() => setModal({ mode: 'create' })}>Make my first board</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <Card key={d.id} className="group p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <Link to={`/dashboards/${d.id}`} className="font-semibold text-slate-900 hover:text-brand-600">
                  {d.name}
                </Link>
                {d.owner_id !== user?.id ? (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">Shared with you</span>
                ) : (
                  <div className="hidden gap-1 group-hover:flex">
                  <button
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    title="Rename"
                    onClick={() => {
                      setName(d.name);
                      setDescription(d.description ?? '');
                      setModal({ mode: 'rename', item: d });
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                    onClick={() => handleDelete(d)}
                  >
                    🗑
                  </button>
                  </div>
                )}
              </div>
              {d.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description}</p>}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                {(d.widgets ?? []).some((w) => w.widget_type === 'pivot') && (
                  <span title="Summary grids">🔢 {(d.widgets ?? []).filter((w) => w.widget_type === 'pivot').length}</span>
                )}
                <div className="flex items-center gap-2.5">
                  {(d.widgets ?? []).some((w) => w.widget_type === 'chart') && (
                    <span title="Charts">📊 {(d.widgets ?? []).filter((w) => w.widget_type === 'chart').length}</span>
                  )}
                  {(d.widgets ?? []).some((w) => w.widget_type === 'kpi') && (
                    <span title="Big numbers">🔢 {(d.widgets ?? []).filter((w) => w.widget_type === 'kpi').length}</span>
                  )}
                  {(d.widgets ?? []).some((w) => w.widget_type === 'table') && (
                    <span title="Tables">📋 {(d.widgets ?? []).filter((w) => w.widget_type === 'table').length}</span>
                  )}
                  {(d.widgets?.length ?? 0) === 0 && <span>Empty board</span>}
                </div>
                <span>{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'New board' : 'Rename board'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">What should we call it?</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sales this quarter" required autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">A short note (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this board about?" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
