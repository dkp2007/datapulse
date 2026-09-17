import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import { dashboards, exportReport, exportPdf, runWidgetQuery, schedules, profile } from '../lib/api.js';
import { defaultLayout, validateSpec } from '../lib/widgets.js';
import { buildBoardPdf } from '../lib/pdf.js';
import { Button, ErrorBanner, Modal, Select, Spinner } from '../components/ui.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';
import { Logo } from '../components/Brand.jsx';
import Widget from '../components/Widget.jsx';
import ShareModal from '../components/ShareModal.jsx';
import WidgetEditModal from '../components/WidgetEditModal.jsx';

const ReactGridLayout = WidthProvider(GridLayout);

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

function rpcSpecFor(widget) {
  const s = widget.spec ?? {};
  if (widget.widget_type === 'kpi') {
    return {
      kind: 'scalar',
      measure: { agg: s.agg ?? 'sum', field: s.field },
      dateField: s.dateField ?? null,
      dateFrom: s.dateFrom || null,
      dateTo: s.dateTo || null,
      comparePrev: !!s.comparePrev,
      filters: s.filters ?? [],
    };
  }
  return {
    kind: 'series',
    dimension: s.dimension,
    dimensionType: s.dimensionType ?? 'text',
    dateGrain: s.dateGrain ?? 'month',
    measures: s.measures ?? [],
    filters: s.filters ?? [],
    limit: s.limit ?? 100,
  };
}

const REFRESH_OPTIONS = [
  { label: 'Live updates: off', value: 0 },
  { label: 'Every 30 seconds', value: 30 },
  { label: 'Every minute', value: 60 },
  { label: 'Every 5 minutes', value: 300 },
  { label: 'Every 10 minutes', value: 600 },
];

export default function DashboardView() {
  const { id } = useParams();
  const confirm = useConfirm();
  const toast = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const [widgetData, setWidgetData] = useState({});
  const widgetsRef = useRef([]);

  const [editing, setEditing] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleList, setScheduleList] = useState([]);
  const [schedForm, setSchedForm] = useState({ email: '', frequency: 'weekly', day_of_week: 1, format: 'pdf' });
  const [schedBusy, setSchedBusy] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [drill, setDrill] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setDashboard(null);
    dashboards.get(id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      setDashboard(data);
      widgetsRef.current = data?.widgets ?? [];
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refreshWidgetData = useCallback(async () => {
    const widgets = widgetsRef.current;
    if (!widgets.length) {
      setWidgetData({});
      return;
    }
    setWidgetData((prev) => {
      const next = { ...prev };
      for (const w of widgets) {
        if (w.widget_type === 'table') continue;
        next[w.id] = { ...next[w.id], loading: true };
      }
      return next;
    });
    const queryable = widgets.filter(
      (w) => w.widget_type !== 'table' && !validateSpec(w.widget_type, w.spec ?? {})
    );
    await Promise.all(
      queryable.map(async (w) => {
        try {
          const spec = rpcSpecFor(w);
          if (dateFrom && dateTo && w.widget_type !== 'kpi') {
            const ds = await (async () => {
              const cols = await import('../lib/api.js').then((m) => m.datasets.get(w.spec.datasetId));
              return cols.data;
            })();
            const dateCol = (ds?.dataset_columns ?? []).find((c) => c.data_type === 'date')?.name;
            if (dateCol) {
              spec.fromDate = dateFrom;
              spec.toDate = dateTo;
              spec.dateField = dateCol;
            }
          }
          if (drill) {
            const col = drill.column;
            const existing = Array.isArray(spec.filters) ? spec.filters : [];
            spec.filters = [...existing.filter((f) => f.field !== col), { field: col, op: '=', value: drill.value, type: 'text' }];
          }
          const data = await runWidgetQuery(w.spec.datasetId, spec);
          setWidgetData((prev) => ({ ...prev, [w.id]: { data, loading: false, error: null } }));
        } catch (err) {
          setWidgetData((prev) => ({ ...prev, [w.id]: { data: null, loading: false, error: err.message } }));
        }
      })
    );
    setLastRefreshedAt(new Date());
  }, [dateFrom, dateTo, drill]);

  useEffect(() => {
    if (!dashboard) return;
    refreshWidgetData();
    const secs = dashboard.auto_refresh_seconds ?? 0;
    if (secs > 0) {
      const iv = setInterval(refreshWidgetData, secs * 1000);
      return () => clearInterval(iv);
    }
  }, [dashboard, refreshWidgetData]);

  async function saveLayout(layout) {
    if (!dashboard) return;
    setDashboard((d) => ({
      ...d,
      widgets: (d.widgets ?? []).map((w) => {
        const l = layout.find((x) => x.i === w.id);
        return l ? { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
      }),
    }));
    setSaving(true);
    await Promise.all(
      layout.map((l) => dashboards.updateWidget(l.i, { layout: { x: l.x, y: l.y, w: l.w, h: l.h } }))
    );
    setSaving(false);
  }

  async function handleSaveWidget({ title, spec }) {
    if (editing?.widget) {
      await dashboards.updateWidget(editing.widget.id, { title, spec });
      setDashboard((d) => ({
        ...d,
        widgets: (d.widgets ?? []).map((w) => (w.id === editing.widget.id ? { ...w, title, spec } : w)),
      }));
      refreshWidgetData();
    } else {
      const widgets = dashboard.widgets ?? [];
      const created = await dashboards.createWidget({
        dashboard_id: dashboard.id,
        widget_type: editing.widgetType,
        title,
        spec,
        layout: defaultLayout(widgets.length),
        position: widgets.length,
      });
      setDashboard((d) => ({ ...d, widgets: [...(d.widgets ?? []), created] }));
      widgetsRef.current = [...widgetsRef.current, created];
      refreshWidgetData();
    }
    setEditing(null);
  }

  async function handleRemoveWidget(w) {
    const ok = await confirm({
      tone: 'danger',
      title: 'Take this tile off?',
      message: `"${w.title}" will be removed from the board. You can always build it again.`,
      confirmLabel: 'Take it off',
    });
    if (!ok) return;
    await dashboards.removeWidget(w.id);
    setDashboard((d) => ({ ...d, widgets: (d.widgets ?? []).filter((x) => x.id !== w.id) }));
    widgetsRef.current = widgetsRef.current.filter((x) => x.id !== w.id);
    toast('Tile removed.');
  }

  async function setAutoRefresh(secs) {
    await dashboards.update(dashboard.id, { auto_refresh_seconds: secs });
    setDashboard((d) => ({ ...d, auto_refresh_seconds: secs }));
  }

  async function handleExport() {
    setExportBusy(true);
    setExportError(null);
    try {
      await exportReport({ dashboardId: dashboard.id, format: exportFormat });
      setShowExport(false);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportBusy(false);
    }
  }

  async function handleExportPdf() {
    setExportBusy(true);
    setExportError(null);
    try {
      const biz = await profile.get().catch(() => null);
      const doc = await buildBoardPdf({ dashboard, widgets, widgetData, biz });
      doc.save(`${dashboard.name.replace(/[^\w -]/g, '')}.pdf`);
      toast('PDF report downloaded.');
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportBusy(false);
    }
  }

  async function openSchedules() {
    setShowSchedule(true);
    const { data } = await schedules.list(dashboard.id);
    setScheduleList(data ?? []);
  }

  async function handleAddSchedule(e) {
    e.preventDefault();
    if (!schedForm.email.trim()) return;
    setSchedBusy(true);
    setError(null);
    try {
      await schedules.create({
        dashboard_id: dashboard.id,
        email: schedForm.email.trim(),
        frequency: schedForm.frequency,
        day_of_week: Number(schedForm.day_of_week),
        format: schedForm.format,
        hour_utc: 2,
      });
      setSchedForm((f) => ({ ...f, email: '' }));
      toast('Schedule set. The report will arrive by email.');
      const { data } = await schedules.list(dashboard.id);
      setScheduleList(data ?? []);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setSchedBusy(false);
    }
  }

  async function toggleSchedule(s) {
    await schedules.setActive(s.id, !s.active);
    const { data } = await schedules.list(dashboard.id);
    setScheduleList(data ?? []);
  }

  async function removeSchedule(s) {
    const ok = await confirm({
      tone: 'danger',
      title: 'Stop this schedule?',
      message: `The report will stop going to ${s.email}.`,
      confirmLabel: 'Stop it',
    });
    if (!ok) return;
    await schedules.remove(s.id);
    const { data } = await schedules.list(dashboard.id);
    setScheduleList(data ?? []);
  }

  if (loadError) {
    return (
      <div>
        <ErrorBanner message={loadError} />
        <Link to="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          ← Back to my boards
        </Link>
      </div>
    );
  }
  if (!dashboard) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const widgets = [...(dashboard.widgets ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const layout = widgets.map((w) => ({
    i: w.id,
    x: w.layout?.x ?? 0,
    y: w.layout?.y ?? 0,
    w: w.layout?.w ?? 6,
    h: w.layout?.h ?? 4,
    minW: 3,
    minH: 3,
  }));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">← My boards</Link>
        {saving && <span className="text-xs text-slate-400">tidying up…</span>}
      </div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dashboard.name}</h1>
          {dashboard.description && <p className="text-sm text-slate-500">{dashboard.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            {lastRefreshedAt ? `fresh as of ${lastRefreshedAt.toLocaleTimeString()}` : ''}
          </span>
          <Select
            className="w-44"
            value={dashboard.auto_refresh_seconds ?? 0}
            onChange={(e) => setAutoRefresh(Number(e.target.value))}
            title="Keep the numbers up to date"
          >
            {REFRESH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" onClick={refreshWidgetData} title="Check the numbers again">
            ⟳ Refresh
          </Button>
          <div className="relative">
            <Button size="sm" onClick={() => setShowAddMenu((v) => !v)}>+ Add a tile</Button>
            {showAddMenu && (
              <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => { setShowAddMenu(false); setEditing({ widgetType: 'chart' }); }}
                >
                  📊 Chart
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => { setShowAddMenu(false); setEditing({ widgetType: 'kpi' }); }}
                >
                  🔢 Big number
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => { setShowAddMenu(false); setEditing({ widgetType: 'table' }); }}
                >
                  📋 Table
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => { setShowAddMenu(false); setEditing({ widgetType: 'pivot' }); }}
                >
                  🔢 Summary grid
                </button>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => openSchedules()} title="Email this board automatically">
            ⏰ Schedule
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>Share</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowExport(true)}>Save report</Button>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Tip: drag a tile by its title to move it, and pull its bottom-right corner to resize.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
        <span className="text-xs font-semibold text-slate-500">📅 Show only</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand-600 focus:outline-none"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand-600 focus:outline-none"
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs font-medium text-brand-600 hover:underline">
            clear dates
          </button>
        )}
        {drill && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            {drill.column}: {drill.value}
            <button onClick={() => setDrill(null)} className="text-brand-400 hover:text-brand-700" title="Clear">×</button>
          </span>
        )}
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-200 bg-white/60 py-16 text-center">
          <Logo size={40} className="mx-auto opacity-70" />
          <p className="mt-3 font-medium text-slate-600">Your board is empty</p>
          <p className="mt-1 text-sm text-slate-400">Add a chart, a big number, or a table to start watching your business.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => setEditing({ widgetType: 'chart' })}>+ Chart</Button>
            <Button variant="secondary" onClick={() => setEditing({ widgetType: 'kpi' })}>+ Big number</Button>
            <Button variant="secondary" onClick={() => setEditing({ widgetType: 'table' })}>+ Table</Button>
          </div>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {widgets.map((w) => (
            <Widget
              key={w.id}
              widget={w}
              data={widgetData[w.id]?.data}
              loading={widgetData[w.id]?.loading}
              error={widgetData[w.id]?.error}
              onEdit={() => setEditing({ widgetType: w.widget_type, widget: w })}
              onRemove={() => handleRemoveWidget(w)}
              onPointClick={
                w.widget_type === 'chart' && w.spec?.dimensionType === 'text'
                  ? (value) => setDrill((d) => (d?.value === value ? null : { column: w.spec?.dimension, value }))
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <ReactGridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={48}
          margin={[12, 12]}
          onLayoutChange={saveLayout}
          draggableHandle=".widget-drag-handle"
        >
          {widgets.map((w) => (
            <div key={w.id} data-widget-id={w.id}>
              <Widget
                widget={w}
                data={widgetData[w.id]?.data}
                loading={widgetData[w.id]?.loading}
                error={widgetData[w.id]?.error}
                onEdit={() => setEditing({ widgetType: w.widget_type, widget: w })}
                onRemove={() => handleRemoveWidget(w)}
                onPointClick={
                  w.widget_type === 'chart' && w.spec?.dimensionType === 'text'
                    ? (value) => setDrill((d) => (d?.value === value ? null : { column: w.spec?.dimension, value }))
                    : undefined
                }
              />
            </div>
          ))}
        </ReactGridLayout>
      )}

      <WidgetEditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        widgetType={editing?.widgetType ?? 'chart'}
        widget={editing?.widget}
        onSave={handleSaveWidget}
      />

      <ShareModal open={showShare} onClose={() => setShowShare(false)} dashboard={dashboard} />

      <Modal open={showExport} onClose={() => setShowExport(false)} title="Save this board as a report">
        <div className="space-y-4">
          <ErrorBanner message={exportError} onClose={() => setExportError(null)} />
          <p className="text-sm text-slate-600">
            We'll make one file with everything on the board, each tile in its own section.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">File type</label>
            <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="pdf">PDF (with your letterhead)</option>
              <option value="csv">CSV (opens anywhere)</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowExport(false)}>Cancel</Button>
            <Button onClick={exportFormat === 'pdf' ? handleExportPdf : handleExport} disabled={exportBusy}>
              {exportBusy ? 'Getting it ready…' : 'Download'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Get this board by email">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Pick a day, and we'll send a fresh PDF of this board — no need to open the app.
          </p>
          <form onSubmit={handleAddSchedule} className="space-y-3">
            <Input
              type="email"
              required
              value={schedForm.email}
              onChange={(e) => setSchedForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email to send to"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">How often</label>
                <Select
                  value={schedForm.frequency}
                  onChange={(e) => setSchedForm((f) => ({ ...f, frequency: e.target.value }))}
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Which day</label>
                <Select
                  value={schedForm.day_of_week}
                  onChange={(e) => setSchedForm((f) => ({ ...f, day_of_week: e.target.value }))}
                  disabled={schedForm.frequency !== 'weekly'}
                >
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="0">Sunday</option>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={schedBusy}>
              {schedBusy ? 'Setting it up…' : 'Set it up'}
            </Button>
          </form>
          {scheduleList.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-500">Active schedules</div>
              {scheduleList.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-700">{s.email}</div>
                    <div className="text-xs text-slate-400">
                      {s.frequency === 'daily' ? 'Every day' : s.frequency === 'monthly' ? 'Every month' : 'Every week'} · {s.format.toUpperCase()}
                      {s.last_sent_at ? ` · last sent ${new Date(s.last_sent_at).toLocaleDateString('en-IN')}` : ' · not sent yet'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleSchedule(s)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {s.active ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => removeSchedule(s)} className="text-slate-300 hover:text-red-500" title="Stop">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
