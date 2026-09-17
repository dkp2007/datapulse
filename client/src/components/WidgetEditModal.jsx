import { useEffect, useState } from 'react';
import { datasets } from '../lib/api.js';
import { AGGREGATES, DATE_GRAINS, newWidgetSpec, validateSpec } from '../lib/widgets.js';
import { Button, ErrorBanner, Input, Modal, Select, Spinner } from './ui.jsx';

const TYPE_NAMES = { chart: 'chart', kpi: 'big number', table: 'table', pivot: 'summary grid' };

const AGG_LABEL = {
  sum: 'Add up',
  avg: 'Average',
  count: 'Count rows',
  count_distinct: 'Count unique',
  min: 'Lowest',
  max: 'Highest',
};

const CHART_LABEL = {
  bar: 'Bars',
  'bar-h': 'Sideways bars',
  line: 'Lines',
  area: 'Filled lines (area)',
  pie: 'Circles (pie)',
  doughnut: 'Rings',
  stacked: 'Stacked bars',
  combo: 'Thick stacked bars',
};

const GRAIN_LABEL = {
  day: 'Each day',
  week: 'Each week',
  month: 'Each month',
  quarter: 'Each 3 months',
  year: 'Each year',
};

export default function WidgetEditModal({ open, onClose, widgetType, widget, onSave }) {
  const editing = !!widget;
  const [title, setTitle] = useState('');
  const [spec, setSpec] = useState(null);
  const [dsList, setDsList] = useState([]);
  const [columns, setColumns] = useState([]);
  const [colsLoading, setColsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(widget?.title ?? '');
    setSpec(widget?.spec ?? (widgetType === 'pivot'
      ? { datasetId: null, rowField: null, rowType: 'text', columnField: null, columnType: 'text', measures: [{ agg: 'sum', field: null }] }
      : newWidgetSpec(widgetType)));
    datasets.list().then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setDsList(data ?? []);
    });
  }, [open, widget, widgetType]);

  useEffect(() => {
    if (!open || !spec?.datasetId) {
      setColumns([]);
      return;
    }
    let cancelled = false;
    setColsLoading(true);
    datasets
      .get(spec.datasetId)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setColumns(data?.dataset_columns ?? []);
        setColsLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setColsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, spec?.datasetId]);

  if (!open || !spec) return null;

  const set = (patch) => setSpec((s) => ({ ...s, ...patch }));
  const numCols = columns.filter((c) => c.data_type === 'number');
  const dateCols = columns.filter((c) => c.data_type === 'date');
  const anyCols = columns;

  function handleDatasetChange(e) {
    const datasetId = e.target.value || null;
    setSpec((s) =>
      widgetType === 'pivot'
        ? { datasetId, rowField: null, rowType: 'text', columnField: null, columnType: 'text', measures: [{ agg: 'sum', field: null }] }
        : { ...newWidgetSpec(widgetType), datasetId }
    );
  }

  function handleDimensionChange(e) {
    const name = e.target.value || null;
    const col = columns.find((c) => c.name === name);
    set({
      dimension: name,
      dimensionType: col?.data_type ?? 'text',
    });
  }

  function setMeasure(i, patch) {
    setSpec((s) => ({
      ...s,
      measures: s.measures.map((m, j) => (j === i ? { ...m, ...patch } : m)),
    }));
  }

  function addMeasure() {
    setSpec((s) => ({
      ...s,
      measures: [...s.measures, { agg: 'sum', field: numCols[0]?.name ?? null }],
    }));
  }

  function removeMeasure(i) {
    setSpec((s) => ({ ...s, measures: s.measures.filter((_, j) => j !== i) }));
  }

  function toggleTableColumn(name) {
    setSpec((s) => {
      const has = s.columns.includes(name);
      return { ...s, columns: has ? s.columns.filter((c) => c !== name) : [...s.columns, name] };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    const vErr = validateSpec(widgetType, spec);
    if (vErr) {
      setError(vErr);
      return;
    }
    setBusy(true);
    try {
      await onSave({ title: title.trim() || 'Untitled tile', spec });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${editing ? 'Edit' : 'New'} ${TYPE_NAMES[widgetType]}`} wide>
      <form onSubmit={handleSave} className="space-y-4">
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name this tile</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Money made each month" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Pick your data</label>
            <Select value={spec.datasetId ?? ''} onChange={handleDatasetChange}>
              <option value="">— choose a file —</option>
              {dsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} lines)
                </option>
              ))}
            </Select>
          </div>
        </div>

        {colsLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Spinner className="h-3.5 w-3.5" /> reading the columns…
          </div>
        )}

        {}
        {widgetType === 'chart' && spec.datasetId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Look</label>
                <Select value={spec.chartType} onChange={(e) => set({ chartType: e.target.value })}>
                  {Object.entries(CHART_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Split by</label>
                <Select value={spec.dimension ?? ''} onChange={handleDimensionChange}>
                  <option value="">— choose a column —</option>
                  {anyCols.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {spec.dimensionType === 'date' && spec.dimension && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Group dates by</label>
                <Select value={spec.dateGrain} onChange={(e) => set({ dateGrain: e.target.value })} className="w-48">
                  {Object.entries(GRAIN_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">What to show</label>
                <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={addMeasure}>
                  + add another
                </button>
              </div>
              <div className="space-y-2">
                {spec.measures.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={m.agg} onChange={(e) => setMeasure(i, { agg: e.target.value })} className="w-40">
                      {Object.entries(AGG_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                    <Select
                      value={m.field ?? ''}
                      onChange={(e) => setMeasure(i, { field: e.target.value || null })}
                      disabled={m.agg === 'count'}
                    >
                      <option value="">— column —</option>
                      {(m.agg === 'count' ? anyCols : numCols).map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </Select>
                    <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => removeMeasure(i)} title="Remove">
                      ✕
                    </button>
                  </div>
                ))}
                {!spec.measures.length && <p className="text-xs text-slate-400">Nothing picked yet — tap "add another" above.</p>}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Example: "Add up" the "revenue" column.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Show at most</label>
              <div className="flex items-center gap-2">
                <Input type="number" min="1" max="500" value={spec.limit} onChange={(e) => set({ limit: Number(e.target.value) || 100 })} className="w-24" />
                <span className="text-xs text-slate-400">groups (like the top months or regions)</span>
              </div>
            </div>
          </>
        )}

        {}
        {widgetType === 'kpi' && spec.datasetId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Show me</label>
                <Select value={spec.agg} onChange={(e) => set({ agg: e.target.value })}>
                  {Object.entries(AGG_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">of which column?</label>
                <Select
                  value={spec.field ?? ''}
                  onChange={(e) => set({ field: e.target.value || null })}
                  disabled={spec.agg === 'count'}
                >
                  <option value="">— column —</option>
                  {(spec.agg === 'count' ? anyCols : numCols).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!spec.comparePrev}
                onChange={(e) => set({ comparePrev: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              Also show how it changed from the time before (pick dates below)
            </label>

            {spec.comparePrev && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Which date column?</label>
                  <Select value={spec.dateField ?? ''} onChange={(e) => set({ dateField: e.target.value || null })}>
                    <option value="">— column —</option>
                    {dateCols.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Starting date</label>
                  <Input type="date" value={spec.dateFrom ?? ''} onChange={(e) => set({ dateFrom: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Ending date</label>
                  <Input type="date" value={spec.dateTo ?? ''} onChange={(e) => set({ dateTo: e.target.value })} />
                </div>
              </div>
            )}
          </>
        )}

        {}
        {widgetType === 'table' && spec.datasetId && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tick the columns to show</label>
            {columns.length === 0 ? (
              <p className="text-xs text-slate-400">Pick a file first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
                {columns.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={spec.columns.includes(c.name)}
                      onChange={() => toggleTableColumn(c.name)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {widgetType === 'pivot' && spec.datasetId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Rows: split by</label>
                <Select
                  value={spec.rowField ?? ''}
                  onChange={(e) => {
                    const col = columns.find((c) => c.name === e.target.value);
                    set({ rowField: e.target.value || null, rowType: col?.data_type ?? 'text' });
                  }}
                >
                  <option value="">— choose a column —</option>
                  {anyCols.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Across the top: split by</label>
                <Select
                  value={spec.columnField ?? ''}
                  onChange={(e) => {
                    const col = columns.find((c) => c.name === e.target.value);
                    set({ columnField: e.target.value || null, columnType: col?.data_type ?? 'text' });
                  }}
                >
                  <option value="">— choose a column —</option>
                  {anyCols.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Inside each box, show</label>
              <div className="flex items-center gap-2">
                <Select
                  value={spec.measures?.[0]?.agg ?? 'sum'}
                  onChange={(e) => set({ measures: [{ ...(spec.measures?.[0] ?? {}), agg: e.target.value }] })}
                  className="w-40"
                >
                  {Object.entries(AGG_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
                <Select
                  value={spec.measures?.[0]?.field ?? ''}
                  onChange={(e) => set({ measures: [{ ...(spec.measures?.[0] ?? {}), field: e.target.value || null }] })}
                  disabled={(spec.measures?.[0]?.agg ?? 'sum') === 'count'}
                >
                  <option value="">— column —</option>
                  {((spec.measures?.[0]?.agg ?? 'sum') === 'count' ? anyCols : numCols).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Example: rows = product, top = region, inside = add up revenue.</p>
            </div>
          </>
        )}

        {!spec.datasetId && (
          <p className="text-xs text-slate-400">Pick a file above to set the rest up.</p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !spec.datasetId}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add to board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
