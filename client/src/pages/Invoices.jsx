import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoices, computeInvoiceTotals, amountInWords, profile } from '../lib/api.js';
import { Button, Card, EmptyState, ErrorBanner, Input, Modal, Select, Spinner } from '../components/ui.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';
import { Logo } from '../components/Brand.jsx';
import { formatNumber } from '../lib/widgets.js';

const GST_RATES = [0, 5, 12, 18, 28];

function money(n) {
  return `₹${formatNumber(Math.round(Number(n) || 0))}`;
}

function nextInvoiceNumber(existing) {
  const fyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const prefix = `${String(fyStart).slice(2)}${String(fyStart + 1).slice(2)}-`;
  const nums = existing
    .map((i) => i.invoice_number)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  return `${prefix}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function blankItem() {
  return { description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 };
}

function InvoicePrint({ inv, biz, totals }) {
  const interState = !!inv.place_of_supply && !!biz?.state && inv.place_of_supply !== biz.state;
  return (
    <div id="invoice-print" className="bg-white p-6 text-slate-800">
      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-3">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <div>
            <div className="text-lg font-bold text-slate-900">{biz?.business_name ?? 'Your business'}</div>
            {biz?.gstin && <div className="text-xs text-slate-500">GSTIN: {biz.gstin}</div>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {biz?.address_line && <div>{biz.address_line}</div>}
          {(biz?.city || biz?.state || biz?.pincode) && (
            <div>
              {[biz.city, biz.state, biz.pincode].filter(Boolean).join(', ')}
            </div>
          )}
          {biz?.phone && <div>{biz.phone}</div>}
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-brand-700">Tax invoice</h2>
          <div className="mt-0.5 text-xs text-slate-500">Invoice #{inv.invoice_number}</div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div><span className="text-slate-400">Date:</span> {inv.invoice_date}</div>
          {inv.due_date && <div><span className="text-slate-400">Due:</span> {inv.due_date}</div>}
          <div><span className="text-slate-400">Place of supply:</span> {inv.place_of_supply || biz?.state || '—'}</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
        <div className="font-semibold text-slate-400">Bill to</div>
        <div className="font-semibold text-slate-800">{inv.client_name}</div>
        {inv.client_gstin && <div className="text-slate-500">GSTIN: {inv.client_gstin}</div>}
        {inv.client_address && <div className="whitespace-pre-line text-slate-500">{inv.client_address}</div>}
      </div>

      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400">
            <th className="py-1.5">What</th>
            <th className="py-1.5">HSN</th>
            <th className="py-1.5 text-right">Qty</th>
            <th className="py-1.5 text-right">Rate</th>
            <th className="py-1.5 text-right">GST %</th>
            <th className="py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {totals.lines.map((it, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-1.5">{it.description || '—'}</td>
              <td className="py-1.5">{it.hsn || '—'}</td>
              <td className="py-1.5 text-right">{it.qty}</td>
              <td className="py-1.5 text-right">{money(it.rate)}</td>
              <td className="py-1.5 text-right">{it.gstRate}%</td>
              <td className="py-1.5 text-right font-medium">{money(it.lineTaxable)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <table className="text-xs">
          <tbody>
            <tr><td className="pr-6 py-0.5 text-slate-500">Taxable value</td><td className="text-right font-medium">{money(totals.taxable)}</td></tr>
            {interState ? (
              <tr><td className="pr-6 py-0.5 text-slate-500">IGST</td><td className="text-right font-medium">{money(totals.igst)}</td></tr>
            ) : (
              <>
                <tr><td className="pr-6 py-0.5 text-slate-500">CGST</td><td className="text-right font-medium">{money(totals.cgst)}</td></tr>
                <tr><td className="pr-6 py-0.5 text-slate-500">SGST</td><td className="text-right font-medium">{money(totals.sgst)}</td></tr>
              </>
            )}
            <tr className="border-t border-slate-300"><td className="pr-6 py-1 font-bold">Total</td><td className="text-right font-bold text-brand-700">{money(totals.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[11px] font-medium text-slate-600">
        Amount in words: {amountInWords(totals.total)}
      </div>
      {inv.notes && <div className="mt-2 text-[11px] text-slate-400">{inv.notes}</div>}

      <div className="mt-4 flex justify-between border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-300">
        <span>Generated with DataPulse</span>
        <span>This is a computer-generated invoice</span>
      </div>
    </div>
  );
}

export default function Invoices() {
  const confirm = useConfirm();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [biz, setBiz] = useState(null);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    client_name: '',
    client_gstin: '',
    client_address: '',
    place_of_supply: '',
    notes: '',
    items: [blankItem()],
    interState: false,
  });

  const totals = useMemo(() => computeInvoiceTotals(form.items, form.interState), [form.items, form.interState]);

  async function load() {
    const [{ data }, { data: p }] = await Promise.all([invoices.list(), profile.get().catch(() => ({ data: null }))]);
    setList(data ?? []);
    setBiz(p);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({
      invoice_number: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      client_name: '',
      client_gstin: '',
      client_address: '',
      place_of_supply: '',
      notes: '',
      items: [blankItem()],
      interState: false,
    });
    setShowNew(true);
  }

  function openEdit(inv) {
    setForm({
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date ?? '',
      client_name: inv.client_name,
      client_gstin: inv.client_gstin ?? '',
      client_address: inv.client_address ?? '',
      place_of_supply: inv.place_of_supply ?? '',
      notes: inv.notes ?? '',
      items: (inv.items ?? []).map((it) => ({ ...blankItem(), ...it })),
      interState: !!inv.place_of_supply && !!biz?.state && inv.place_of_supply !== biz.state,
    });
    setShowNew(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.client_name.trim()) {
      setError('Who are you billing? Add the client name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = {
        invoice_number: form.invoice_number.trim() || nextInvoiceNumber(list ?? []),
        invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        client_name: form.client_name.trim(),
        client_gstin: form.client_gstin.trim().toUpperCase() || null,
        client_address: form.client_address.trim() || null,
        place_of_supply: form.place_of_supply || biz?.state || null,
        notes: form.notes.trim() || null,
        items: form.items
          .filter((it) => it.description.trim() || Number(it.rate) > 0)
          .map(({ description, hsn, qty, rate, gstRate }) => ({ description, hsn, qty, rate, gstRate })),
      };
      if (form.id) {
        await invoices.update(form.id, payload);
        toast('Invoice updated.');
      } else {
        await invoices.create(payload);
        toast('Invoice created.');
      }
      setShowNew(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(inv) {
    const ok = await confirm({
      tone: 'danger',
      title: `Delete invoice ${inv.invoice_number}?`,
      message: 'The printout you already shared stays valid — this only removes it from the app.',
      confirmLabel: 'Yes, delete it',
    });
    if (!ok) return;
    await invoices.remove(inv.id);
    toast('Invoice deleted.');
    await load();
  }

  const monthTotals = useMemo(() => {
    const m = {};
    for (const inv of list ?? []) {
      const key = (inv.invoice_date ?? '').slice(0, 7);
      if (!key) continue;
      const inter = !!inv.place_of_supply && !!biz?.state && inv.place_of_supply !== biz.state;
      const t = computeInvoiceTotals(inv.items, inter);
      m[key] = m[key] ?? { taxable: 0, tax: 0, count: 0 };
      m[key].taxable += t.taxable;
      m[key].tax += t.cgst + t.sgst + t.igst;
      m[key].count += 1;
    }
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [list, biz?.state]);

  const editing = showNew && !!form.id;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">Make GST-ready invoices in a minute — fill it in, print or save as PDF, send it.</p>
        </div>
        <Button onClick={openNew}>+ New invoice</Button>
      </div>

      {!biz?.business_name || !biz?.gstin ? (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your invoices look better with your business name and GST number on them.{' '}
          <Link to="/settings" className="font-semibold underline">Add them in Settings</Link> — it takes two minutes.
        </Card>
      ) : null}

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {list === null ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No invoices yet"
          hint="Create your first invoice — pick a client, add what you sold, and the GST math happens by itself."
          action={<Button onClick={openNew}>Make my first invoice</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <h3 className="text-sm font-semibold text-slate-700">All invoices</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {list.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        #{inv.invoice_number} · {inv.client_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {inv.invoice_date} · {money(computeInvoiceTotals(inv.items, false).total)}
                      </div>
                    </div>
                    <button className="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700" title="View / print" onClick={() => setViewing(inv)}>👁</button>
                    <button className="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700" title="Edit" onClick={() => openEdit(inv)}>✏️</button>
                    <button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => handleRemove(inv)}>🗑</button>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-700">Month by month</h3>
              <p className="text-xs text-slate-400">Billed amounts, ready for your GST filing</p>
              <div className="mt-3 space-y-2.5">
                {monthTotals.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Nothing billed yet.</p>}
                {monthTotals.map(([month, t]) => (
                  <div key={month} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{month}</span>
                      <span>{t.count} invoice{t.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-xs text-slate-500">
                      <span>Taxable {money(t.taxable)}</span>
                      <span>GST {money(t.tax)}</span>
                    </div>
                  </div>
                ))}              </div>
            </Card>
          </div>
        </>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} wide title={editing ? 'Edit invoice' : 'New invoice'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Invoice number (leave blank to auto-number)</label>
              <Input value={form.invoice_number} onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))} placeholder={nextInvoiceNumber(list ?? [])} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
              <Input type="date" value={form.invoice_date} onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Client name</label>
              <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Who you're billing" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Client GSTIN (if any)</label>
              <Input value={form.client_gstin} onChange={(e) => setForm((f) => ({ ...f, client_gstin: e.target.value }))} placeholder="27ABCDE1234F1Z5" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Client address</label>
            <Input value={form.client_address} onChange={(e) => setForm((f) => ({ ...f, client_address: e.target.value }))} placeholder="Street, city, PIN" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Place of supply (state)</label>
              <Input value={form.place_of_supply} onChange={(e) => setForm((f) => ({ ...f, place_of_supply: e.target.value }))} placeholder={biz?.state ?? 'Karnataka'} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Sale type</label>
              <Select value={form.interState ? 'inter' : 'intra'} onChange={(e) => setForm((f) => ({ ...f, interState: e.target.value === 'inter' }))}>
                <option value="intra">Same state (CGST + SGST)</option>
                <option value="inter">Another state (IGST)</option>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-xs font-semibold text-slate-500">What you sold</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }))} className="text-xs font-semibold text-brand-600 hover:underline">
                + add a line
              </button>
            </div>
            <div className="space-y-2 p-3">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_72px_64px_88px_88px_28px] items-center gap-2">
                  <Input value={it.description} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) }))} placeholder="Item or service" />
                  <Input value={it.hsn} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, hsn: e.target.value } : x)) }))} placeholder="HSN" />
                  <Input type="number" min="0" value={it.qty} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)) }))} />
                  <Input type="number" min="0" value={it.rate} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) }))} placeholder="₹ rate" />
                  <Select value={String(it.gstRate)} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, gstRate: Number(e.target.value) } : x)) }))}>
                    {GST_RATES.map((r) => (<option key={r} value={r}>{r}%</option>))}
                  </Select>
                  <button type="button" title="Remove line" className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
              <span className="text-slate-500">Taxable <b className="text-slate-700">{money(totals.taxable)}</b></span>
              {form.interState ? (
                <span className="text-slate-500">IGST <b className="text-slate-700">{money(totals.igst)}</b></span>
              ) : (
                <>
                  <span className="text-slate-500">CGST <b className="text-slate-700">{money(totals.cgst)}</b></span>
                  <span className="text-slate-500">SGST <b className="text-slate-700">{money(totals.sgst)}</b></span>
                </>
              )}
              <span className="font-bold text-brand-700">Total {money(totals.total)}</span>
            </div>
          </div>

          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Note (optional) — e.g. thank you for your business" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save invoice'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={`Invoice ${viewing?.invoice_number ?? ''}`}>
        {viewing && (
          <>
            <InvoicePrint inv={viewing} biz={biz} totals={computeInvoiceTotals(viewing.items, false)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
              <Button onClick={() => window.print()}>🖨 Print / save as PDF</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
