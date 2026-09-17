import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { datasets } from '../lib/api.js';
import { Button, Card, ErrorBanner, Input, Spinner } from '../components/ui.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';

const TYPE_LABEL = {
  number: 'numbers',
  date: 'dates',
  text: 'words',
  boolean: 'yes/no',
};

const TYPE_BADGE = {
  number: 'bg-sky-100 text-sky-700',
  date: 'bg-violet-100 text-violet-700',
  text: 'bg-slate-100 text-slate-600',
  boolean: 'bg-amber-100 text-amber-700',
};

const HISTORY_LIMIT = 100;

function coerce(value, type) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (v === '') return null;
  if (type === 'number') {
    const n = Number(v.replace(/[₹,%\s]/g, ''));
    return isNaN(n) ? v : n;
  }
  return v;
}

export default function DataEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();

  const isNew = !id;
  const [loading, setLoading] = useState(!!id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingHeader, setEditingHeader] = useState(null);
  const [headerName, setHeaderName] = useState('');
  const [savedId, setSavedId] = useState(id ?? null);
  const nameRef = useRef(null);

  const history = useRef({
    past: [],
    future: [],
    lastCellKey: null,
  });
  const [histTick, setHistTick] = useState(0);

  function snapshot() {
    return {
      columns: columns.map((c) => ({ ...c })),
      rows: rows.map((r) => ({ ...r })),
      name,
      description,
    };
  }

  function record(priorSnapshot, cellKey) {
    const h = history.current;
    if (cellKey && h.lastCellKey === cellKey && h.past.length) {
      return;
    }
    h.past.push(priorSnapshot);
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    h.lastCellKey = cellKey ?? null;
    setHistTick((t) => t + 1);
  }

  function applySnapshot(s) {
    setColumns(s.columns);
    setRows(s.rows);
    setName(s.name);
    setDescription(s.description);
    setDirty(true);
  }

  function undo() {
    const h = history.current;
    if (!h.past.length) return;
    const current = snapshot();
    const prev = h.past.pop();
    h.future.push(current);
    h.lastCellKey = null;
    applySnapshot(prev);
    setHistTick((t) => t + 1);
  }

  function redo() {
    const h = history.current;
    if (!h.future.length) return;
    const current = snapshot();
    const next = h.future.pop();
    h.past.push(current);
    h.lastCellKey = null;
    applySnapshot(next);
    setHistTick((t) => t + 1);
  }

  const canUndo = history.current.past.length > 0;
  const canRedo = history.current.future.length > 0;

  useEffect(() => {
    function onKey(e) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!id) {
      setColumns([
        { name: 'date', data_type: 'date' },
        { name: 'item', data_type: 'text' },
        { name: 'amount', data_type: 'number' },
      ]);
      setRows([{}, {}, {}]);
      setName('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await datasets.get(id);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setName(data.name);
      setDescription(data.description ?? '');
      setColumns((data.dataset_columns ?? []).map((c) => ({ name: c.name, data_type: c.data_type })));
      const { data: rowRes, error: rErr } = await datasets.rows(id, { limit: 1000 });
      if (cancelled) return;
      if (rErr) setError(rErr.message);
      else setRows((rowRes ?? []).map((r) => r.data));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const blankRow = useMemo(() => ({}), []);

  function setCell(r, colName, value) {
    const prior = snapshot();
    setRows((rs) => rs.map((row, i) => (i === r ? { ...row, [colName]: value } : row)));
    setDirty(true);
    record(prior, `cell:${r}:${colName}`);
  }

  function addRow() {
    const prior = snapshot();
    setRows((rs) => [...rs, { ...blankRow }]);
    setDirty(true);
    record(prior, `row:add:${rows.length}`);
  }

  function removeRow(i) {
    const prior = snapshot();
    setRows((rs) => rs.filter((_, j) => j !== i));
    setDirty(true);
    record(prior, `row:del:${i}:${Date.now()}`);
  }

  function addColumn() {
    const prior = snapshot();
    setColumns((cs) => [...cs, { name: `column ${cs.length + 1}`, data_type: 'text' }]);
    setDirty(true);
    record(prior, `col:add:${columns.length}`);
  }

  function removeColumn(idx) {
    const prior = snapshot();
    setColumns((cs) => cs.filter((_, i) => i !== idx));
    setDirty(true);
    record(prior, `col:del:${idx}:${Date.now()}`);
  }

  function changeType(idx, type) {
    const prior = snapshot();
    setColumns((cs) => cs.map((c, i) => (i === idx ? { ...c, data_type: type } : c)));
    setDirty(true);
    record(prior, `type:${idx}:${Date.now()}`);
  }

  function commitHeaderEdit() {
    if (editingHeader === null) return;
    const clean = headerName.trim();
    setEditingHeader(null);
    if (!clean || clean === columns[editingHeader]?.name) return;
    const prior = snapshot();
    setColumns((cs) => cs.map((c, i) => (i === editingHeader ? { ...c, name: clean } : c)));
    setDirty(true);
    record(prior, `header:${editingHeader}:${Date.now()}`);
  }

  async function handleSave() {
    const cleanCols = columns.filter((c) => c.name.trim());
    if (!cleanCols.length) {
      setError('Keep at least one column with a name.');
      return;
    }
    if (!name.trim()) {
      setError('Give this file a name first.');
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let dsId = savedId;
      if (!dsId) {
        const ds = await datasets.createManual(name.trim(), description.trim());
        dsId = ds.id;
        setSavedId(dsId);
      } else {
        await datasets.rename(dsId, name.trim());
      }

      const used = cleanCols.map((c) => c.name);
      setColumns(cleanCols);
      const cleanRows = rows.map((row) => {
        const out = {};
        for (const c of cleanCols) {
          out[c.name] = coerce(row[c.name], c.data_type);
        }
        return out;
      });

      await datasets.setColumns(dsId, cleanCols);
      await datasets.setRows(dsId, cleanRows);

      setRows(cleanRows);
      setDirty(false);
      history.current = { past: [], future: [], lastCellKey: null };
      setHistTick((t) => t + 1);
      toast('Saved. Your data is up to date.');
      navigate('/datasets');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBack() {
    if (dirty) {
      const ok = await confirm({
        tone: 'danger',
        title: 'Leave without saving?',
        message: 'The changes you made here have not been saved yet.',
        confirmLabel: 'Leave anyway',
      });
      if (!ok) return;
    }
    navigate('/datasets');
  }

  function handlePaste(e, r, c) {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\n') && !text.includes('\t')) return;
    e.preventDefault();
    const prior = snapshot();
    const grid = text.replace(/\r/g, '').split('\n').filter((l) => l.length).map((line) => line.split('\t'));
    setRows((rs) => {
      const next = [...rs];
      grid.forEach((line, dr) => {
        const ri = r + dr;
        if (ri >= next.length) next.push({});
        line.forEach((val, dc) => {
          const col = columns[c + dc];
          if (col) next[ri][col.name] = val;
        });
      });
      return next;
    });
    setDirty(true);
    record(prior, `paste:${r}:${c}:${Date.now()}`);
  }

  function downloadExcel() {
    const header = columns.map((c) => c.name);
    const data = rows.map((row) => columns.map((c) => coerce(row[c.name], c.data_type)));
    const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, (name.trim() || 'Data').slice(0, 31));
    XLSX.writeFile(book, `${(name.trim() || 'data').replace(/[^\w-]+/g, '-')}.xlsx`);
    toast('Excel file downloaded.');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'Type your data in' : 'Edit data'}</h1>
            <p className="text-sm text-slate-500">Like a small spreadsheet — type in the boxes, add lines, and save.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600">unsaved changes</span>}
          <Button variant="secondary" onClick={downloadExcel}>⬇ Excel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">File name</label>
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder="e.g. My shop sales"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">A short note (optional)</label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDirty(true);
              }}
              placeholder="What is this data about?"
            />
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          ↩ Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          ↪ Redo
        </button>
        <span className="ml-2 text-xs text-slate-400">Ctrl+Z to undo · Ctrl+Y to redo</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="w-10 border-b border-r border-slate-200 px-1 py-2 text-center text-[10px] font-semibold text-slate-400">#</th>
                {columns.map((col, ci) => (
                  <th key={ci} className="min-w-[150px] border-b border-r border-slate-200 px-2 py-2 text-left align-top">
                    <div className="flex items-center justify-between gap-1">
                      {editingHeader === ci ? (
                        <input
                          autoFocus
                          value={headerName}
                          onChange={(e) => setHeaderName(e.target.value)}
                          onBlur={commitHeaderEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitHeaderEdit();
                            if (e.key === 'Escape') setEditingHeader(null);
                          }}
                          className="w-full rounded border border-brand-400 px-1.5 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingHeader(ci);
                            setHeaderName(col.name);
                          }}
                          className="truncate text-sm font-semibold text-slate-800 hover:text-brand-600"
                          title="Click to rename"
                        >
                          {col.name}
                        </button>
                      )}
                      <div className="flex shrink-0 items-center gap-0.5">
                        <select
                          value={col.data_type}
                          onChange={(e) => changeType(ci, e.target.value)}
                          className="rounded border-0 bg-transparent p-0 text-[10px] font-medium text-slate-400 focus:outline-none hover:text-brand-600"
                          title="What kind of thing goes in this column"
                        >
                          {Object.entries(TYPE_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        {columns.length > 1 && (
                          <button
                            onClick={() => removeColumn(ci)}
                            className="rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                            title="Remove this column"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[col.data_type]}`}>
                      {TYPE_LABEL[col.data_type]}
                    </span>
                  </th>
                ))}
                <th className="w-24 border-b border-slate-200 px-2 py-2">
                  <button onClick={addColumn} className="text-xs font-semibold text-brand-600 hover:underline">+ column</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="group hover:bg-brand-50/30">
                  <td className="border-b border-r border-slate-100 px-1 py-1 text-center text-[10px] text-slate-300">{ri + 1}</td>
                  {columns.map((col, ci) => (
                    <td key={ci} className="border-b border-r border-slate-100 p-0">
                      <input
                        value={row[col.name] ?? ''}
                        onChange={(e) => setCell(ri, col.name, e.target.value)}
                        onPaste={(e) => handlePaste(e, ri, ci)}
                        className={`w-full bg-transparent px-2 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-400 ${col.data_type === 'number' ? 'text-right tabular-nums' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="border-b border-slate-100 px-1 py-1 text-center">
                    <button
                      onClick={() => removeRow(ri)}
                      className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Remove this line"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-sm text-slate-400">
                    No lines yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2">
          <button onClick={addRow} className="text-sm font-semibold text-brand-600 hover:underline">+ add a line</button>
          <span className="text-xs text-slate-400">
            {rows.length} lines × {columns.length} columns
          </span>
        </div>
      </Card>

      <div className="mt-3 rounded-lg bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-600">Tip:</span> copy cells straight from Excel or Google Sheets and paste them here —
        rows and columns fill in automatically. And the ⬇ Excel button hands the same data back as a spreadsheet.
      </div>
    </div>
  );
}
