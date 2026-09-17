import { useEffect, useState } from 'react';
import { profile } from '../lib/api.js';
import { Button, Card, ErrorBanner, Input, Select, Spinner } from '../components/ui.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Andaman & Nicobar Islands', 'Dadra & Nagar Haveli and Daman & Diu',
];

const TYPES = [
  'Sole proprietor', 'Partnership', 'LLP', 'Private Limited', 'Public Limited',
  'HUF', 'One Person Company', 'Trust / NGO', 'Other',
];

const FISCAL = [
  { value: 'apr', label: 'April to March (most common)' },
  { value: 'jan', label: 'January to December' },
  { value: 'jul', label: 'July to June' },
];

function clean(v) {
  return (v ?? '').replace(/\s+/g, '').toUpperCase();
}

function validate(f) {
  if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(clean(f.gstin))) {
    return 'That GST number does not look right. It should be 15 characters, like 27ABCDE1234F1Z5.';
  }
  if (f.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(clean(f.pan))) {
    return 'That PAN does not look right. It should be 10 characters, like ABCDE1234F.';
  }
  if (f.pincode && !/^\d{6}$/.test(f.pincode.replace(/\s+/g, ''))) {
    return 'A PIN code has 6 digits, like 560001.';
  }
  if (f.phone && !/^(\+91)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ''))) {
    return 'That phone number does not look right. Use 10 digits, like 9876543210.';
  }
  return null;
}

const FIELDS = [
  { key: 'business_name', label: 'Business name', placeholder: 'Sharma Traders Pvt Ltd', span: 2 },
  { key: 'owner_name', label: 'Your name', placeholder: 'Anil Sharma', span: 1 },
  { key: 'phone', label: 'Phone number', placeholder: '98765 43210', span: 1 },
  { key: 'address_line', label: 'Address', placeholder: 'Shop 12, MG Road', span: 2 },
  { key: 'city', label: 'City', placeholder: 'Bengaluru', span: 1 },
  { key: 'pincode', label: 'PIN code', placeholder: '560001', span: 1 },
];

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    profile
      .get()
      .then((p) => setForm(p ?? {}))
      .catch((err) => {
        setForm({});
        setError(err.message);
      });
  }, []);

  function set(key) {
    return (e) => {
      setSaved(false);
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };
  }

  async function handleSave(e) {
    e.preventDefault();
    const vErr = validate(form);
    if (vErr) {
      setError(vErr);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const normalised = {
        ...form,
        gstin: clean(form.gstin) || null,
        pan: clean(form.pan) || null,
        pincode: (form.pincode ?? '').replace(/\s+/g, '') || null,
      };
      const p = await profile.save(normalised);
      setForm(p);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Business details</h1>
        <p className="text-sm text-slate-500">
          Fill these in once — they show up on your reports and keep everything in one place.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {saved && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Saved. Your details are up to date.
          </div>
        )}

        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-slate-900">The basics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                <Input value={form[f.key] ?? ''} onChange={set(f.key)} placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
              <Select value={form.state ?? ''} onChange={set('state')}>
                <option value="">— pick your state —</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type of business</label>
              <Select value={form.business_type ?? ''} onChange={set('business_type')}>
                <option value="">— pick one —</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="mb-1 font-semibold text-slate-900">Tax and registration numbers</h2>
          <p className="mb-4 text-xs text-slate-400">Only fill what you have. Leave the rest empty.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GST number (GSTIN)</label>
              <Input value={form.gstin ?? ''} onChange={set('gstin')} placeholder="27ABCDE1234F1Z5" className="uppercase" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">PAN</label>
              <Input value={form.pan ?? ''} onChange={set('pan')} placeholder="ABCDE1234F" className="uppercase" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CIN (for companies)</label>
              <Input value={form.cin ?? ''} onChange={set('cin')} placeholder="U74999MH2019PTC123456" className="uppercase" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Udyam / MSME number</label>
              <Input value={form.udyam_number ?? ''} onChange={set('udyam_number')} placeholder="UDYAM-MH-01-0012345" className="uppercase" />
            </div>
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Your business year</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">When does your money year start?</label>
            <Select value={form.fiscal_year_start ?? 'apr'} onChange={set('fiscal_year_start')}>
              {FISCAL.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Your account</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">Signed in as</div>
              <div className="text-sm text-slate-500">{user?.email}</div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
          </div>
        </Card>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save details'}
          </Button>
        </div>
      </form>
    </div>
  );
}
