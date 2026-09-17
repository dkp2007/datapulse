import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { supabase } from '../lib/supabase.js';
import { datasets, dashboards, reports, documents, profile, goals, runWidgetQuery } from '../lib/api.js';
import { Card, EmptyState, ErrorBanner, Spinner, Input, Select, Button } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatNumber } from '../lib/widgets.js';
import FirstRunChecklist from '../components/FirstRunChecklist.jsx';
import { BRAND } from '../components/Brand.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const BLUE_SHADES = ['#247cd1', '#48b8e9', '#174dbf', '#8ec6ee', '#1e6abc', '#bcdcf5', '#123f9e'];

function money(n) {
  return `₹${formatNumber(Math.round(Number(n) || 0))}`;
}

function compactMoney(v) {
  const n = Number(v) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${formatNumber(Math.round(n))}`;
}

function StatCard({ icon, label, value, hint, to }) {
  const body = (
    <Card className="h-full p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg">{icon}</span>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">{label}</div>
          <div className="truncate text-2xl font-bold text-slate-900">{value}</div>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

function MoneyBars({ rows }) {
  const labels = rows.map((r) => r.month);
  const values = rows.map((r) => Number(r.total) || 0);
  return (
    <div className="h-56">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Money in (₹)',
              data: values,
              backgroundColor: 'rgba(36, 124, 209, 0.85)',
              hoverBackgroundColor: '#174dbf',
              borderRadius: 6,
              maxBarThickness: 42,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${compactMoney(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: {
              grid: { color: '#f1f5f9' },
              border: { display: false },
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                callback: (v) => compactMoney(v),
              },
            },
          },
        }}
      />
    </div>
  );
}

function AreaTrend({ rows }) {
  const labels = rows.map((r) => r.month);
  const values = rows.map((r) => Number(r.total) || 0);
  return (
    <div className="h-56">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Trend (₹)',
              data: values,
              borderColor: '#247cd1',
              backgroundColor: (ctx) => {
                const { chart } = ctx;
                if (!chart.chartArea) return 'rgba(36, 124, 209, 0.15)';
                const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
                g.addColorStop(0, 'rgba(36, 124, 209, 0.35)');
                g.addColorStop(1, 'rgba(36, 124, 209, 0.02)');
                return g;
              },
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#247cd1',
              borderWidth: 2.5,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${compactMoney(ctx.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: {
              grid: { color: '#f1f5f9' },
              border: { display: false },
              ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => compactMoney(v) },
            },
          },
        }}
      />
    </div>
  );
}

function ByAreaDonut({ rows }) {
  const labels = rows.map((r) => r.dimension);
  const values = rows.map((r) => Number(r.values?.[0]) || 0);
  return (
    <div className="h-56">
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: BLUE_SHADES,
              borderWidth: 2,
              borderColor: '#fff',
              hoverOffset: 6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          plugins: {
            legend: { position: 'right', labels: { color: '#475569', boxWidth: 10, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${compactMoney(ctx.parsed)}` } },
          },
        }}
      />
    </div>
  );
}

function SideBySideBars({ rows }) {
  const labels = rows.map((r) => r.month);
  const rev = rows.map((r) => Number(r.rev) || 0);
  const exp = rows.map((r) => Number(r.exp) || 0);
  return (
    <div className="h-56">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Money in (₹)',
              data: rev,
              backgroundColor: 'rgba(36, 124, 209, 0.85)',
              borderRadius: 5,
              maxBarThickness: 30,
            },
            {
              label: 'Money out (₹)',
              data: exp,
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderRadius: 5,
              maxBarThickness: 30,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#475569', boxWidth: 10, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${compactMoney(ctx.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: {
              grid: { color: '#f1f5f9' },
              border: { display: false },
              ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => compactMoney(v) },
            },
          },
        }}
      />
    </div>
  );
}

function BoardHealth({ boards }) {
  const withTiles = boards.filter((b) => (b.widgets ?? []).length > 0);
  const labels = withTiles.slice(0, 6).map((b) => b.name);
  const values = withTiles.slice(0, 6).map((b) => (b.widgets ?? []).length);
  return (
    <div className="h-48">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Tiles pinned',
              data: values,
              backgroundColor: BLUE_SHADES,
              borderRadius: 6,
              maxBarThickness: 34,
            },
          ],
        }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              border: { display: false },
              ticks: { color: '#94a3b8', stepSize: 1, font: { size: 11 } },
            },
            y: { grid: { display: false }, ticks: { color: '#475569', font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}

function GoalsCard() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', metric: 'sum', field: '', datasetId: '', dateField: '' });
  const [options, setOptions] = useState({ datasets: [], numberCols: [], dateCols: [] });
  const [error, setError] = useState(null);

  async function load() {
    const { data } = await goals.list();
    setList(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showForm || options.datasets.length) return;
    datasets.list().then(async ({ data }) => {
      const ds = data ?? [];
      setOptions((o) => ({ ...o, datasets: ds }));
      if (ds.length) {
        const cols = await datasets.get(ds[0].id);
        const cs = cols.data?.dataset_columns ?? [];
        setOptions((o) => ({
          ...o,
          numberCols: cs.filter((c) => c.data_type === 'number'),
          dateCols: cs.filter((c) => c.data_type === 'date'),
        }));
      }
    });
  }, [showForm]);

  async function pickDataset(e) {
    const datasetId = e.target.value;
    setForm((f) => ({ ...f, datasetId }));
    if (!datasetId) return;
    const cols = await datasets.get(datasetId);
    const cs = cols.data?.dataset_columns ?? [];
    setOptions((o) => ({
      ...o,
      numberCols: cs.filter((c) => c.data_type === 'number'),
      dateCols: cs.filter((c) => c.data_type === 'date'),
    }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.target) {
      setError('Give it a name and a target amount.');
      return;
    }
    setError(null);
    try {
      await goals.create({
        name: form.name.trim(),
        target: Number(form.target),
        metric: form.metric,
        field: form.metric === 'count' ? null : form.field || null,
        dataset_id: form.datasetId || null,
        date_field: form.dateField || null,
        period: 'month',
      });
      toast('Goal set. Good luck!');
      setShowForm(false);
      setForm({ name: '', target: '', metric: 'sum', field: '', datasetId: '', dateField: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(g) {
    await goals.remove(g.id);
    toast('Goal removed.');
    await load();
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Monthly goals</h3>
          <p className="text-xs text-slate-400">Set a target and watch the month fill up.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          {showForm ? 'Close' : '+ New goal'}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="What are you aiming for? e.g. Monthly sales" />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="Target amount (₹)" />
            <Select value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}>
              <option value="sum">Add up a column</option>
              <option value="count">Count the lines</option>
            </Select>
          </div>
          {form.metric === 'sum' && (
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.datasetId} onChange={pickDataset}>
                <option value="">— pick your file —</option>
                {options.datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
              <Select value={form.field} onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}>
                <option value="">— which column —</option>
                {options.numberCols.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}
          <Select value={form.dateField} onChange={(e) => setForm((f) => ({ ...f, dateField: e.target.value }))}>
            <option value="">— date column (to know which month) —</option>
            {options.dateCols.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full">Set this goal</Button>
        </form>
      )}

      <div className="mt-4 space-y-4">
        {(list ?? []).map((g) => (
          <GoalRow key={g.id} goal={g} onRemove={() => handleRemove(g)} />
        ))}
        {list && list.length === 0 && !showForm && (
          <p className="py-4 text-center text-xs text-slate-400">
            No goals yet — set one and this card fills up as the month goes on.
          </p>
        )}
      </div>
    </Card>
  );
}

function GoalRow({ goal, onRemove }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let cancelled = false;
    goals
      .progress(goal.id)
      .then((p) => !cancelled && setProgress(p))
      .catch(() => !cancelled && setProgress(null));
    return () => {
      cancelled = true;
    };
  }, [goal.id]);

  const value = Number(progress?.value) || 0;
  const target = Number(goal.target) || 1;
  const pct = Math.min(100, Math.round((value / target) * 100));
  const crossed = value >= target;

  return (
    <div className={`rounded-xl border p-3 ${crossed ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">
            {crossed && '🎉 '}{goal.name}
          </div>
          <div className="text-xs text-slate-400">
            {compactMoney(value)} of {compactMoney(target)} this month
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${crossed ? 'text-emerald-600' : 'text-brand-700'}`}>{pct}%</span>
          <button onClick={onRemove} className="text-slate-300 hover:text-red-500" title="Remove goal">×</button>
        </div>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${crossed ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-brand-600 to-brand-400'}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      {crossed && <p className="mt-1.5 text-xs font-medium text-emerald-600">Goal crossed — well done!</p>}
    </div>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    files: 0,
    totalLines: 0,
    boards: 0,
    tiles: 0,
    savedReports: 0,
    docs: 0,
    profileDone: 0,
  });
  const [revenue, setRevenue] = useState(null);
  const [byRegion, setByRegion] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [boardHealth, setBoardHealth] = useState([]);
  const [invTotals, setInvTotals] = useState({ count: 0, billed: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [filesRes, boardsRes, reportsRes, docsRes, invRes] = await Promise.all([
          datasets.list(),
          dashboards.list(),
          reports.list(),
          documents.list(),
          supabase.from('invoices').select('invoice_date, place_of_supply, items, client_gstin'),
        ]);
        if (cancelled) return;

        const files = filesRes.data ?? [];
        const boards = boardsRes.data ?? [];
        const totalLines = files.reduce((n, f) => n + (f.row_count ?? 0), 0);
        const tiles = boards.reduce((n, b) => n + (b.widgets?.length ?? 0), 0);

        let profileDone = 0;
        try {
          const p = await profile.get();
          if (p) {
            const filled = ['business_name', 'gstin', 'pan', 'phone', 'city', 'state'].filter((k) => !!p[k]);
            profileDone = Math.round((filled.length / 6) * 100);
          }
        } catch {
          profileDone = 0;
        }

        if (cancelled) return;
        setStats({
          files: files.length,
          totalLines,
          boards: boards.length,
          tiles,
          savedReports: (reportsRes.data ?? []).length,
          docs: (docsRes.data ?? []).length,
          profileDone,
        });
        setBoardHealth(boards);

        const invoices = invRes.data ?? [];
        let billed = 0;
        for (const inv of invoices) {
          const t = computeInvTotals(inv.items);
          billed += t.total;
        }
        setInvTotals({ count: invoices.length, billed });

        const revenueFile =
          files.find((f) => f.row_count > 0 && /revenue|sales|income/i.test(f.name)) ??
          files.find((f) => f.row_count > 0 && !/expense/i.test(f.name));
        const expenseFile = files.find((f) => f.row_count > 0 && /expense/i.test(f.name));

        async function monthSeries(datasetId, moneyCol, dateCol) {
          return runWidgetQuery(datasetId, {
            kind: 'series',
            dimension: dateCol,
            dimensionType: 'date',
            dateGrain: 'month',
            measures: [{ agg: 'sum', field: moneyCol }],
            filters: [],
            limit: 12,
          });
        }

        if (revenueFile) {
          const cols = await datasets.get(revenueFile.id);
          if (cancelled) return;
          const colMeta = cols.data?.dataset_columns ?? [];
          const numberCols = colMeta.filter((c) => c.data_type === 'number').map((c) => c.name);
          const textCols = colMeta.filter((c) => c.data_type === 'text').map((c) => c.name);
          const moneyCol =
            numberCols.find((n) => /revenue|amount|sales|total/i.test(n)) ??
            numberCols.find((n) => /price|value/i.test(n)) ??
            numberCols[0];
          const dateCol = colMeta.find((c) => c.data_type === 'date')?.name;
          const groupCol = textCols.find((n) => /region|state|city|zone|area|branch|product|category/i.test(n));

          if (moneyCol && dateCol) {
            const res = await monthSeries(revenueFile.id, moneyCol, dateCol);
            if (cancelled) return;
            setRevenue(res);

            if (groupCol) {
              const gres = await runWidgetQuery(revenueFile.id, {
                kind: 'series',
                dimension: groupCol,
                dimensionType: 'text',
                measures: [{ agg: 'sum', field: moneyCol }],
                filters: [],
                limit: 8,
              });
              if (cancelled) return;
              setByRegion(gres);
            }
          }
        }

        if (expenseFile) {
          const cols = await datasets.get(expenseFile.id);
          if (cancelled) return;
          const numberCols = (cols.data?.dataset_columns ?? [])
            .filter((c) => c.data_type === 'number')
            .map((c) => c.name);
          const expCol =
            numberCols.find((n) => /amount|total/i.test(n) && !/gst/i.test(n)) ??
            numberCols[0];
          const expDateCol = (cols.data?.dataset_columns ?? []).find((c) => c.data_type === 'date')?.name;
          if (expCol && expDateCol) {
            const res = await monthSeries(expenseFile.id, expCol, expDateCol);
            if (cancelled) return;
            setExpenses(res);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const revRows = (revenue?.rows ?? []).map((r) => ({ month: r.dimension, total: r.values?.[0] ?? 0 }));
  const expRows = (expenses?.rows ?? []).map((r) => ({ month: r.dimension, total: r.values?.[0] ?? 0 }));
  const regionRows = byRegion?.rows ?? [];

  const monthMap = new Map();
  for (const r of revRows) monthMap.set(r.month, { month: r.month, rev: r.total, exp: 0 });
  for (const r of expRows) {
    const existing = monthMap.get(r.month);
    if (existing) existing.exp = r.total;
    else monthMap.set(r.month, { month: r.month, rev: 0, exp: r.total });
  }
  const combinedRows = [...monthMap.values()].sort((a, b) => (a.month < b.month ? -1 : 1)).slice(-12);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Every corner of your business in pictures — money in, money out, and what needs a push.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <FirstRunChecklist
        files={stats.files}
        boards={stats.boards}
        tiles={stats.tiles}
        profileDone={stats.profileDone}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🗂" label="Files you added" value={formatNumber(stats.files)} to="/datasets" />
        <StatCard icon="📋" label="Lines of data" value={formatNumber(stats.totalLines)} hint="Across all your files" />
        <StatCard icon="📌" label="Boards" value={formatNumber(stats.boards)} hint={`${formatNumber(stats.tiles)} tiles pinned`} to="/boards" />
        <StatCard icon="📄" label="Papers stored" value={formatNumber(stats.docs)} to="/documents" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <StatCard icon="📤" label="Reports saved" value={formatNumber(stats.savedReports)} to="/reports" />
        <StatCard
          icon="🧾"
          label="Invoices billed"
          value={money(invTotals.billed)}
          hint={`${invTotals.count} invoice${invTotals.count === 1 ? '' : 's'} total`}
          to="/invoices"
        />
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">Business details filled</div>
              <div className="text-2xl font-bold text-slate-900">{stats.profileDone}%</div>
            </div>
            <Link to="/settings">
              <span className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                Complete it
              </span>
            </Link>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all" style={{ width: `${stats.profileDone}%` }} />
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Goals</h2>
      <GoalsCard />

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">The money picture</h2>
      {revRows.length === 0 && expRows.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon="💰"
            title="No money numbers to show yet"
            hint="Add a file with a 'date' and a money column (like revenue or sales), and your monthly story appears here automatically."
            action={<Link to="/datasets/import"><span className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Add a file</span></Link>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {revRows.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-700">Money coming in — month by month</h3>
              <p className="mb-4 text-xs text-slate-400">Your sales file, added up for each month</p>
              <MoneyBars rows={revRows} />
            </Card>
          )}
          {revRows.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-700">The trend</h3>
              <p className="mb-4 text-xs text-slate-400">Same numbers as a smooth line — going up or down?</p>
              <AreaTrend rows={revRows} />
            </Card>
          )}
          {expRows.length > 0 && revRows.length > 0 && (
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-700">Money in vs money out</h3>
              <p className="mb-4 text-xs text-slate-400">Blue is what you earned, green is what you spent — side by side, every month</p>
              <SideBySideBars rows={combinedRows} />
            </Card>
          )}
          {regionRows.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-700">Where the money comes from</h3>
              <p className="mb-4 text-xs text-slate-400">Share of each {regionRows.length > 0 ? 'area or product' : ''}</p>
              <ByAreaDonut rows={regionRows} />
            </Card>
          )}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700">Your boards at a glance</h3>
            <p className="mb-4 text-xs text-slate-400">How many tiles each board is carrying</p>
            {boardHealth.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">No boards yet.</p>
            ) : (
              <BoardHealth boards={boardHealth} />
            )}
          </Card>
        </div>
      )}

      <p className="mt-8 text-xs text-slate-400">
        {BRAND.name} builds these pictures from your own files and invoices. Add more data and the page fills up by itself.
      </p>
    </div>
  );
}

function computeInvTotals(items) {
  let total = 0;
  for (const it of items ?? []) {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const gst = Number(it.gstRate) || 0;
    total += qty * rate * (1 + gst / 100);
  }
  return { total };
}
