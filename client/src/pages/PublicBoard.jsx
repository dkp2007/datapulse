import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sharing } from '../lib/api.js';
import { Card, ErrorBanner, Spinner } from '../components/ui.jsx';
import { Logo } from '../components/Brand.jsx';
import { seriesToChartData, formatNumber } from '../lib/widgets.js';
import ChartWidget from '../components/ChartWidget.jsx';
import KpiWidget from '../components/KpiWidget.jsx';

function SimpleTable({ columns, rows }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-white text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap border-b border-slate-200 px-2 py-1.5 font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((v, j) => (
                <td key={j} className="max-w-[220px] truncate whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-slate-600">
                  {v === null || v === undefined ? <span className="text-slate-300">—</span> : typeof v === 'number' ? formatNumber(v) : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PublicBoard() {
  const { token } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sharing
      .fetchPublicBoard(token)
      .then(setBoard)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-brand-50/50">
      <header className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Logo size={26} />
          <span className="font-bold text-brand-800">DataPulse</span>
          <span className="ml-auto rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold text-brand-700">SHARED · READ ONLY</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
        ) : error ? (
          <Card className="mx-auto max-w-md p-8 text-center">
            <ErrorBanner message={error} />
            <p className="mt-4 text-sm text-slate-500">Ask the person who shared this to send a fresh link.</p>
          </Card>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">{board.name}</h1>
            {board.description && <p className="mt-1 text-sm text-slate-500">{board.description}</p>}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {board.tiles.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${t.type === 'kpi' ? '' : 'md:col-span-2 lg:col-span-2'}`}
                >
                  <h3 className="mb-2 truncate text-sm font-semibold text-slate-700">{t.title}</h3>
                  <div className="h-44">
                    {t.type === 'kpi' ? (
                      <KpiWidget data={t.data} />
                    ) : t.type === 'chart' ? (
                      <ChartWidget spec={{ chartType: 'bar', measures: [] }} data={t.data} />
                    ) : (
                      <SimpleTable columns={t.columns ?? []} rows={t.rows ?? []} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-xs text-slate-400">
              Shared with DataPulse — see what your business is doing.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
