import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoices, computeInvoiceTotals, profile } from '../lib/api.js';
import { Button, Card, EmptyState, ErrorBanner, Select, Spinner } from '../components/ui.jsx';
import { formatNumber } from '../lib/widgets.js';
import { BRAND } from '../components/Brand.jsx';

function money(n) {
  return `₹${formatNumber(Math.round(Number(n) || 0))}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export default function GstSummary() {
  const [list, setList] = useState(null);
  const [biz, setBiz] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    Promise.all([invoices.list(), profile.get().catch(() => ({ data: null }))])
      .then(([inv, prof]) => {
        setList(inv.data ?? []);
        setBiz(prof.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const months = useMemo(() => {
    const byMonth = {};
    for (const inv of list ?? []) {
      const key = (inv.invoice_date ?? '').slice(0, 7);
      if (!key) continue;
      const inter = !!inv.place_of_supply && !!biz?.state && inv.place_of_supply !== biz.state;
      const t = computeInvoiceTotals(inv.items, inter);
      const m = (byMonth[key] = byMonth[key] ?? {
        key,
        count: 0,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
        b2b: 0,
        b2c: 0,
        rates: {},
      });
      m.count += 1;
      m.taxable += t.taxable;
      m.cgst += t.cgst;
      m.sgst += t.sgst;
      m.igst += t.igst;
      m.total += t.total;
      if (inv.client_gstin) m.b2b += 1;
      else m.b2c += 1;
      for (const line of t.lines) {
        m.rates[line.gstRate] = (m.rates[line.gstRate] ?? 0) + line.lineTaxable;
      }
    }
    return Object.values(byMonth).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [list, biz?.state]);

  const shown = period === 'all' ? months : months.filter((m) => m.key === period);

  const allRates = useMemo(() => {
    const s = new Set();
    for (const m of months) for (const r of Object.keys(m.rates)) s.add(Number(r));
    return [...s].sort((a, b) => a - b);
  }, [months]);

  function exportCsv() {
    const rows = [
      ['Month', 'Invoices', 'B2B', 'B2C', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total'],
      ...shown.map((m) => [
        m.key,
        m.count,
        m.b2b,
        m.b2c,
        m.taxable.toFixed(2),
        m.cgst.toFixed(2),
        m.sgst.toFixed(2),
        m.igst.toFixed(2),
        m.total.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const bizName = biz?.business_name ?? 'your business';
  const bizGstin = biz?.gstin;

  if (list === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GST summary</h1>
          <p className="text-sm text-slate-500">
            Month-end tax numbers from your invoices — the same figures your accountant asks for at filing time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-44">
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>{monthLabel(m.key)}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={exportCsv} disabled={!shown.length}>⬇ CSV</Button>
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {bizGstin && (
        <p className="mb-4 text-xs text-slate-400">
          Filed under {bizName} · GSTIN {bizGstin}
        </p>
      )}

      {months.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon="🧾"
            title="No GST numbers yet"
            hint="The moment you create invoices, your month-wise tax summary builds itself here."
            action={<Link to="/invoices"><Button>Make an invoice</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {shown.map((m) => (
            <Card key={m.key} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{monthLabel(m.key)}</h3>
                  <p className="text-xs text-slate-400">{m.count} invoice{m.count > 1 ? 's' : ''} · {m.b2b} with GSTIN (B2B) · {m.b2c} without (B2C)</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Total billed</div>
                  <div className="text-lg font-bold text-brand-700">{money(m.total)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                <MiniStat label="Taxable value" value={money(m.taxable)} />
                <MiniStat label="CGST" value={money(m.cgst)} />
                <MiniStat label="SGST" value={money(m.sgst)} />
                <MiniStat label="IGST" value={money(m.igst)} />
              </div>

              <div className="px-5 pb-5">
                <div className="mb-2 text-xs font-semibold text-slate-500">Tax rate breakdown — for GSTR-1</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-400">
                      <th className="py-1.5">Rate</th>
                      <th className="py-1.5 text-right">Taxable amount</th>
                      <th className="py-1.5 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRates
                      .filter((r) => m.rates[r])
                      .map((r) => (
                        <tr key={r} className="border-b border-slate-50">
                          <td className="py-1.5 font-medium text-slate-600">{r}%</td>
                          <td className="py-1.5 text-right text-slate-600">{money(m.rates[r])}</td>
                          <td className="py-1.5 text-right text-slate-600">{money((m.rates[r] * r) / 100)}</td>
                        </tr>
                      ))}
                    {allRates.filter((r) => m.rates[r]).length === 0 && (
                      <tr><td colSpan="3" className="py-3 text-center text-slate-300">Nothing billed this month.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 bg-brand-50/40 px-5 py-3 text-[11px] text-slate-500">
                <b>3B ready:</b> outward taxable supply {money(m.taxable)} · CGST {money(m.cgst)} + SGST {money(m.sgst)} + IGST {money(m.igst)}. Hand this page (or the CSV) to your accountant at month-end.
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}
