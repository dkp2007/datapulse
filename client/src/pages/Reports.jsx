import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboards, exportReport, reports } from '../lib/api.js';
import { Button, Card, EmptyState, ErrorBanner, Spinner } from '../components/ui.jsx';
import { formatNumber } from '../lib/widgets.js';

export default function Reports() {
  const [items, setItems] = useState([]);
  const [dashes, setDashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    const [{ data, error: err }, { data: dData }] = await Promise.all([
      reports.list(),
      dashboards.list(),
    ]);
    if (err) setError(err.message);
    else setItems(data ?? []);
    setDashes(dData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function reExport(report) {
    setBusyId(report.id);
    setError(null);
    try {
      await exportReport({
        dashboardId: report.dashboard_id,
        widgetIds: report.config?.widgetIds,
        name: report.name,
        format: report.config?.format ?? 'csv',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Saved reports</h1>
        <p className="text-sm text-slate-500">Every file you've saved is kept here — grab another copy any time.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📤"
          title="Nothing saved yet"
          hint="Open one of your boards and hit 'Save report' — we'll keep a copy here so you can download it again whenever you need it."
          action={
            <Link to="/">
              <Button>Go to my boards</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">From board</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Saved on</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.dashboards?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                      {r.config?.format ?? 'csv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatNumber(r.config?.rowCount ?? 0)}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" disabled={busyId === r.id} onClick={() => reExport(r)}>
                      {busyId === r.id ? 'Getting it ready…' : 'Download again'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
