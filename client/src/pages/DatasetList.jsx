import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { datasets } from '../lib/api.js';
import { Button, Card, EmptyState, ErrorBanner, Input, Modal, Spinner } from '../components/ui.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatNumber } from '../lib/widgets.js';

const TYPE_BADGE = {
  number: 'bg-sky-100 text-sky-700',
  date: 'bg-violet-100 text-violet-700',
  text: 'bg-slate-100 text-slate-600',
  boolean: 'bg-amber-100 text-amber-700',
};

const TYPE_LABEL = {
  number: 'numbers',
  date: 'dates',
  text: 'words',
  boolean: 'yes/no',
};

export default function DatasetList() {
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    const q = search.trim().toLowerCase();
    if (!q) return preview.rows;
    return preview.rows.filter((row) =>
      preview.columns.some((c) => String(row[c.name] ?? '').toLowerCase().includes(q))
    );
  }, [preview, search]);

  async function load() {
    setLoading(true);
    const { data, error: err } = await datasets.list();
    if (err) setError(err.message);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function openPreview(ds) {
    setPreviewLoading(true);
    setSearch('');
    setPreview({ dataset: ds, columns: [], rows: [] });
    const [{ data: cols, error: cErr }, { data: rows, error: rErr }] = await Promise.all([
      datasets.get(ds.id),
      datasets.rows(ds.id, { limit: 20 }),
    ]);
    if (cErr || rErr) setError(cErr?.message ?? rErr?.message);
    else setPreview({ dataset: ds, columns: cols.dataset_columns ?? [], rows: (rows ?? []).map((r) => r.data) });
    setPreviewLoading(false);
  }

  async function handleDelete(ds) {
    const ok = await confirm({
      tone: 'danger',
      title: 'Delete this file?',
      message: `"${ds.name}" will be gone for good, and anything using it will go blank.`,
      confirmLabel: 'Yes, delete it',
    });
    if (!ok) return;
    try {
      await datasets.remove(ds.id);
      toast('File deleted.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await datasets.rename(renaming.id, newName.trim());
      setRenaming(null);
      toast('Name updated.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My data</h1>
          <p className="text-sm text-slate-500">The files you brought in — ready to use on any board.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/datasets/new')}>✏️ Type it in</Button>
          <Link to="/datasets/import">
            <Button>+ Add a file</Button>
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🗂"
          title="Nothing here yet"
          hint="Upload a spreadsheet, or type your numbers in directly — both work. Your data will be ready to use on any board right away."
          action={
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/datasets/new')}>✏️ Type it in</Button>
              <Link to="/datasets/import">
                <Button>Add my first file</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">From file</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Added on</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button className="font-medium text-brand-600 hover:underline" onClick={() => openPreview(d)}>
                      {d.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.source_filename}</td>
                  <td className="px-4 py-3">{formatNumber(d.row_count)}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="mr-2 text-slate-400 hover:text-brand-600" onClick={() => openPreview(d)} title="Peek inside">
                      👁
                    </button>
                    <button
                      className="mr-2 text-slate-400 hover:text-brand-600"
                      title="Edit the lines in this file"
                      onClick={() => navigate(`/datasets/edit/${d.id}`)}
                    >
                      ✏️
                    </button>
                    <button
                      className="mr-2 text-slate-400 hover:text-brand-600"
                      title="Rename"
                      onClick={() => {
                        setRenaming(d);
                        setNewName(d.name);
                      }}
                    >
                      🏷
                    </button>
                    <button className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(d)} title="Delete">
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename this file">
        <form onSubmit={handleRename} className="space-y-4">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type="submit">Save name</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={`Peek inside — ${preview?.dataset?.name ?? ''}`} wide>
        {previewLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div>
            {preview?.rows?.length > 8 && (
              <div className="mb-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to find something in these lines…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                />
              </div>
            )}
            <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left shadow-[0_1px_0_0_#e2e8f0]">
                  <tr>
                    <th className="w-10 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">#</th>
                    {preview?.columns?.map((c) => (
                      <th key={c.id} className="whitespace-nowrap px-3 py-2">
                        <div className={`font-semibold text-slate-700 ${c.data_type === 'number' ? 'text-right' : ''}`}>{c.name}</div>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[c.data_type] ?? 'bg-slate-100 text-slate-500'}`}>
                          {TYPE_LABEL[c.data_type] ?? c.data_type}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row, i) => (
                    <tr key={i} className="hover:bg-brand-50/40">
                      <td className="whitespace-nowrap px-2 py-1.5 text-center text-[10px] text-slate-300">{i + 1}</td>
                      {preview.columns.map((c) => {
                        const v = row[c.name];
                        const isNum = c.data_type === 'number' && v !== null && v !== undefined && v !== '';
                        return (
                          <td key={c.id} className={`max-w-[240px] truncate whitespace-nowrap px-3 py-1.5 text-slate-600 ${isNum ? 'text-right tabular-nums font-medium text-slate-700' : ''}`}>
                            {v === null || v === undefined || v === '' ? <span className="text-slate-300">—</span> : isNum ? formatNumber(v) : String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                  }
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={(preview?.columns?.length ?? 0) + 1} className="px-3 py-8 text-center text-slate-400">
                        Nothing matches "{search}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Showing {filteredRows.length} of the first {preview?.rows?.length ?? 0} lines — {formatNumber(preview?.dataset?.row_count ?? 0)} in the file
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
