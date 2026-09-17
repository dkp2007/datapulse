import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { documents, DOC_TYPES } from '../lib/api.js';
import { Button, Card, EmptyState, ErrorBanner, Input, Modal, Select, Spinner } from '../components/ui.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatNumber } from '../lib/widgets.js';

const TYPE_EMOJI = {
  gst: '🧾', pan: '🪪', udyam: '🏢', incorporation: '📜', license: 'tp️',
  invoice: '🧾', statement: '🏦', contract: '🤝', other: '📄',
};

function typeLabel(v) {
  return DOC_TYPES.find((t) => t.value === v)?.label ?? 'Other papers';
}

function fileSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentWallet() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [viewUrl, setViewUrl] = useState(null);
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await documents.list();
    if (err) setError(err.message);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(
    () => (filter === 'all' ? items : items.filter((d) => d.doc_type === filter)),
    [items, filter]
  );

  async function handleFiles(files) {
    const list = [...files].filter(Boolean);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of list) {
        await documents.upload(f, f.name, 'other');
      }
      toast(list.length === 1 ? 'Paper added to your wallet.' : `${list.length} papers added to your wallet.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleView(doc) {
    setError(null);
    try {
      const url = await documents.signedUrl(doc.file_path, { download: false });
      setViewDoc(doc);
      setViewUrl(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDownload(doc) {
    setBusyId(doc.id);
    setError(null);
    try {
      const url = await documents.signedUrl(doc.file_path, { download: doc.name });
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleTypeChange(doc, t) {
    try {
      await documents.setType(doc.id, t);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await documents.rename(renaming.id, newName.trim());
      setRenaming(null);
      toast('Name updated.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(doc) {
    const ok = await confirm({
      tone: 'danger',
      title: 'Throw this paper away?',
      message: `"${doc.name}" will be removed from your wallet. You can always upload it again.`,
      confirmLabel: 'Yes, throw it away',
    });
    if (!ok) return;
    try {
      await documents.remove(doc);
      toast('Paper removed.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document wallet</h1>
          <p className="text-sm text-slate-500">
            Your business papers — GST, PAN, licenses, anything important — kept safe and ready any time.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Add papers'}
        </Button>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        className={`mb-5 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
          dragOver ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white/60 text-slate-500'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" /> Putting your papers away…
          </span>
        ) : (
          <>Drag files here, or use the <button className="font-semibold text-brand-600 hover:underline" onClick={() => inputRef.current?.click()}>add papers</button> button. Any file type, up to 50 MB each.</>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All ({items.length})
          </button>
          {DOC_TYPES.map((t) => {
            const n = items.filter((d) => d.doc_type === t.value).length;
            if (!n) return null;
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === t.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {t.label} ({n})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🗄"
          title="No papers stored yet"
          hint="Keep your GST certificate, PAN, licenses, and other important files here — view or download them any time, from anywhere."
          action={<Button onClick={() => inputRef.current?.click()}>Add your first paper</Button>}
        />
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Nothing in this category.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((doc) => (
            <Card key={doc.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{TYPE_EMOJI[doc.doc_type] ?? '📄'}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {fileSize(doc.file_size) || 'file'}
                </span>
              </div>
              <h3 className="mt-2 truncate font-semibold text-slate-900" title={doc.name}>{doc.name}</h3>
              <p className="text-xs text-slate-400">
                Added {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              <div className="mt-3">
                <Select value={doc.doc_type} onChange={(e) => handleTypeChange(doc, e.target.value)} className="text-xs">
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <Button size="sm" variant="secondary" onClick={() => handleView(doc)}>View</Button>
                <Button size="sm" variant="secondary" disabled={busyId === doc.id} onClick={() => handleDownload(doc)}>
                  {busyId === doc.id ? '…' : 'Download'}
                </Button>
                <div className="ml-auto flex">
                  <button
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    title="Rename"
                    onClick={() => {
                      setRenaming(doc);
                      setNewName(doc.name);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                    onClick={() => handleDelete(doc)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename this paper">
        <form onSubmit={handleRename} className="space-y-4">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type="submit">Save name</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewDoc} onClose={() => { setViewDoc(null); setViewUrl(null); }} title={viewDoc?.name ?? ''} wide>
        {viewUrl ? (
          <div className="flex flex-col items-center gap-4">
            {viewDoc?.mime_type?.startsWith('image/') ? (
              <img src={viewUrl} alt={viewDoc.name} className="max-h-[60vh] rounded-lg object-contain" />
            ) : viewDoc?.mime_type === 'application/pdf' ? (
              <iframe src={viewUrl} title={viewDoc.name} className="h-[60vh] w-full rounded-lg border" />
            ) : (
              <div className="py-6 text-center text-sm text-slate-500">
                This file type cannot be shown here — use Download to open it on your device.
              </div>
            )}
            <Button onClick={() => handleDownload(viewDoc)}>Download a copy</Button>
          </div>
        ) : (
          <div className="flex justify-center py-8"><Spinner className="h-8 w-8" /></div>
        )}
      </Modal>
    </div>
  );
}
