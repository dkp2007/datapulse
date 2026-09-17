import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { importFile, importSheetsUrl } from '../lib/api.js';
import { Button, Card, ErrorBanner, Input, Spinner } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

const STEPS = ['Pick your file', 'Quick look', 'Bring it in'];

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

export default function ImportWizard() {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('file');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const accepted = useMemo(
    () => file && /\.(csv|xlsx)$/i.test(file.name) && file.size <= 25 * 1024 * 1024,
    [file]
  );

  function pickFile(f) {
    setError(null);
    setResult(null);
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      setError("That file type won't work — please use a CSV or Excel file");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError('That file is too big — the limit is 25 MB');
      return;
    }
    setFile(f);
    setDatasetName(f.name.replace(/\.(csv|xlsx)$/i, ''));
    setStep(1);
  }

  async function handleImport() {
    setStep(2);
    setProgress(8);
    setError(null);
    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) / 12) : p));
    }, 300);
    try {
      const res = mode === 'sheets'
        ? await importSheetsUrl(sheetsUrl, datasetName.trim() || undefined)
        : await importFile(file, datasetName.trim() || undefined);
      clearInterval(timer);
      toast('Data brought in successfully.');
      setProgress(100);
      setResult(res);
    } catch (err) {
      clearInterval(timer);
      setError(err.message);
      setStep(mode === 'sheets' ? 0 : 1);
    }
  }

  async function handleSheetsSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!/\/spreadsheets\/d\//.test(sheetsUrl)) {
      setError('Paste the full link to your Google Sheet.');
      return;
    }
    setStep(2);
    setProgress(8);
    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) / 12) : p));
    }, 300);
    try {
      const res = await importSheetsUrl(sheetsUrl, datasetName.trim() || undefined);
      clearInterval(timer);
      toast('Sheet brought in successfully.');
      setProgress(100);
      setResult(res);
    } catch (err) {
      clearInterval(timer);
      setError(err.message);
      setStep(0);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add data</h1>
          <p className="text-sm text-slate-500">CSV or Excel files, up to 25 MB. The first row should be your column names.</p>
        </div>
        <Link to="/datasets">
          <Button variant="secondary" size="sm">← Back to my data</Button>
        </Link>
      </div>

      {}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= step ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {step === 0 && (
        <Card className="p-8">
          <div className="mb-6 flex justify-center gap-2">
            <button
              onClick={() => setMode('file')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'file' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📄 Upload a file
            </button>
            <button
              onClick={() => setMode('sheets')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'sheets' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🌐 Google Sheets link
            </button>
          </div>

          {mode === 'file' ? (
            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
                dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-slate-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <div className="text-4xl">📥</div>
              <p className="mt-3 font-medium text-slate-700">Drop your file here</p>
              <p className="mt-1 text-sm text-slate-500">or</p>
              <Button className="mt-3" onClick={() => inputRef.current?.click()}>
                Choose a file
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <p className="mt-4 text-xs text-slate-400">
                We'll read the columns for you — numbers, dates, everything — so you don't have to set anything up.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSheetsSubmit} className="mx-auto max-w-lg space-y-4 py-6">
              <div className="text-center">
                <div className="text-4xl">🌐</div>
                <p className="mt-3 font-medium text-slate-700">Bring data straight from a Google Sheet</p>
                <p className="mt-1 text-sm text-slate-500">
                  The sheet must be shared as "Anyone with the link can view".
                </p>
              </div>
              <Input
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
              <Input
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Give it a name (optional)"
              />
              <Button type="submit" className="w-full">Bring it in →</Button>
            </form>
          )}
        </Card>
      )}

      {step === 1 && file && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{file.name.toLowerCase().endsWith('.csv') ? '📄' : '📗'}</span>
              <div>
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setFile(null); setStep(0); }}>
              Pick a different file
            </Button>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Give it a name</label>
            <Input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} placeholder="e.g. Sales 2026" />
          </div>
          <Button className="w-full" onClick={handleImport}>
            Bring it in →
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-8">
          {result ? (
            <div className="text-center">
              <div className="text-4xl">✅</div>
              <h3 className="mt-2 text-lg font-bold text-slate-900">All done!</h3>
              <p className="mt-1 text-sm text-slate-500">
                We brought in <span className="font-medium text-slate-700">{result.rowCount}</span> lines from{' '}
                <span className="font-medium text-slate-700">{result.name}</span>
              </p>
              <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
                {result.columns?.map((c) => (
                  <span key={c.name} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_BADGE[c.type] ?? 'bg-slate-100 text-slate-600'}`}>
                    {c.name} · {TYPE_LABEL[c.type] ?? c.type}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="secondary" onClick={() => { setFile(null); setResult(null); setStep(0); }}>
                  Add another file
                </Button>
                <Button onClick={() => navigate('/datasets')}>See my data</Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Spinner className="mx-auto h-10 w-10" />
              <h3 className="mt-4 font-semibold text-slate-900">Reading your file…</h3>
              <p className="mt-1 text-sm text-slate-500">This usually takes just a few seconds</p>
              <div className="mx-auto mt-4 h-2 w-64 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${Math.round(progress)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{Math.round(progress)}%</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
