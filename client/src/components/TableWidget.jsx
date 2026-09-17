import { useEffect, useState } from 'react';
import { datasets } from '../lib/api.js';

export default function TableWidget({ spec }) {
  const [state, setState] = useState({ loading: true, rows: [], error: null });

  useEffect(() => {
    if (!spec?.datasetId) {
      setState({ loading: false, rows: [], error: 'No file picked yet' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    datasets
      .rows(spec.datasetId, { limit: 200 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setState({ loading: false, rows: [], error: error.message });
        else setState({ loading: false, rows: (data ?? []).map((r) => r.data), error: null });
      })
      .catch((e) => !cancelled && setState({ loading: false, rows: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [spec?.datasetId]);

  const cols = spec?.columns ?? [];

  if (state.loading) return <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading…</div>;
  if (state.error) return <div className="flex h-full items-center justify-center px-4 text-center text-xs text-red-500">{state.error}</div>;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-white text-slate-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap border-b border-slate-200 px-2 py-1.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {cols.map((c) => (
                <td key={c} className="max-w-[220px] truncate whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-slate-600">
                  {row[c] === null || row[c] === undefined ? <span className="text-slate-300">—</span> : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
          {!state.rows.length && (
            <tr>
              <td colSpan={cols.length} className="px-2 py-6 text-center text-slate-400">
                This file has no lines
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
