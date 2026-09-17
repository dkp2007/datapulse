import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui.jsx';
import { Logo, BRAND } from '../components/Brand.jsx';

const steps = [
  {
    number: '1',
    title: 'Add a file',
    text: 'Drop in a spreadsheet — CSV or Excel. That is all the setup there is.',
  },
  {
    number: '2',
    title: 'Pick what to see',
    text: 'Choose a column to split by and a number to add up. A picture appears.',
  },
  {
    number: '3',
    title: 'Put it on a board',
    text: 'Pin the pictures you like. They refresh themselves, so you always see today.',
  },
];

const features = [
  { icon: '📊', title: 'Pictures, not walls of numbers', text: 'Bars, lines, and circles that make the story obvious in one glance.' },
  { icon: '🔢', title: 'Big numbers', text: 'The few figures you truly care about, shown large and kept up to date.' },
  { icon: '↕️', title: 'Compare with last week', text: 'Little arrows show whether you are doing better or worse than before.' },
  { icon: '🔁', title: 'Always fresh', text: 'Pick how often your board refreshes — every 30 seconds or every 10 minutes.' },
  { icon: '📥', title: 'Take reports with you', text: 'Save any board as a spreadsheet to share with your team.' },
  { icon: '🔒', title: 'Private by default', text: 'What you add is yours alone. Nobody else can see your boards.' },
];

function MiniChart() {
  const bars = [34, 52, 44, 66, 58, 78, 92];
  return (
    <div className="mx-auto mt-12 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-brand-900/5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-400">Money made each month</div>
          <div className="mt-0.5 text-2xl font-bold text-slate-900">₹84,220</div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">▲ 12.4%</span>
      </div>
      <svg viewBox="0 0 280 90" className="mt-4 w-full">
        <line x1="0" y1="88" x2="280" y2="88" stroke="#e2e8f0" strokeWidth="1" />
        {bars.map((h, i) => (
          <rect
            key={i}
            x={10 + i * 38}
            y={88 - h * 0.85}
            width="24"
            height={h * 0.85}
            rx="4"
            className="fill-brand-500"
            opacity={i === bars.length - 1 ? 1 : 0.35 + i * 0.1}
          />
        ))}
        <path
          d="M22 60 L60 48 L98 54 L136 36 L174 42 L212 24 L250 14"
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-lg font-bold text-brand-800">{BRAND.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="secondary" size="sm">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Create account</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-14 text-center sm:pt-20">
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            See what your business is doing,
            <span className="text-brand-600"> at a glance</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            {BRAND.name} turns your spreadsheets into clear charts and big numbers — so you
            stop digging through files and start seeing the story.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Create a free account
            </Link>
          </div>

          <MiniChart />
          <p className="mt-4 text-xs text-slate-400">A peek at what your board can look like</p>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
          <p className="mt-2 text-center text-sm text-slate-500">Three steps. No manuals.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {steps.map((s) => (
              <Card key={s.number} className="p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {s.number}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-slate-900">What you get</h2>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="text-center sm:text-left">
                  <div className="text-3xl">{f.icon}</div>
                  <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Logo size={56} className="mx-auto" />
          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            Your numbers are already in a file somewhere.
          </h2>
          <p className="mt-3 text-slate-600">
            Bring them over and see the whole picture in minutes.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-block rounded-lg bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Sign in and look around
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        {BRAND.name} — {BRAND.tagline}
      </footer>
    </div>
  );
}
