import { useEffect, useState } from 'react';
import { datasets, runWidgetQuery } from '../lib/api.js';
import { formatNumber } from '../lib/widgets.js';

export default function PivotWidget({ spec }) {
  const [state, setState] = useState({ loading: true, matrix: null, error: null });

  useEffect(() => {
    if (!spec?.datasetId || !spec?.rowField || !spec?.columnField) {
      setState({ loading: false, matrix: null, error: 'Pick how to split the rows and columns' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      try {
        const [rowRes, colRes, cellRes] = await Promise.all([
          runWidgetQuery(spec.datasetId, {
            kind: 'series',
            dimension: spec.rowField,
            dimensionType: spec.rowType ?? 'text',
            measures: spec.meases ?? spec.measures ?? [],
            filters: spec.filters ?? [],
            limit: 50,
          }),
          runWidgetQuery(spec.datasetId, {
            kind: 'series',
            dimension: spec.columnField,
            dimensionType: spec.columnType ?? 'text',
            measures: spec.measures ?? [],
            filters: spec.filters ?? [],
            limit: 12,
          }),
          datasets.rows(spec.datasetId, { limit: 1000 }),
        ]);

        if (cancelled) return;
        const rawRows = cellRes?.data ?? cellRes ?? [];
        const rowData = rowRes?.rows ?? [];
        const colData = colRes?.rows ?? [];

        const rowKeys = rowData.map((r) => r.dimension);
        const colKeys = colData.map((r) => r.dimension);
        const agg = (spec.measures ?? [])[0] ?? { agg: 'sum' };

        const cellMap = {};
        for (const r of rawRows) {
          const rk = String(r.data?.[spec.rowField] ?? '(blank)');
          const ck = String(r.data?.[spec.columnField] ?? '(blank)');
          const v = Number(r.data?.[(spec.measures ?? [])[0]?.field]);
          const key = `${rk}||${ck}`;
          if (!(key in cellMap)) cellMap[key] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
          const c = cellMap[key];
          if (!isNaN(v)) {
            c.sum += v;
            c.count += 1;
            c.min = Math.min(c.min, v);
            c.max = Math.max(c.max, v);
          } else {
            c.count += 1;
          }
        }

        const matrix = colKeys.map((ck) => ({
          column: ck,
          cells: rowKeys.map((rk) => {
            const c = cellMap[`${rk}||${ck}`];
            if (!c || c.count === 0) return null;
            if (agg.agg === 'count') return c.count;
            if (agg.agg === 'avg') return c.count ? c.sum / c.count : null;
            if (agg.agg === 'min') return c.min === Infinity ? null : c.min;
            if (agg.agg === 'max') return c.max === -Infinity ? null : c.max;
            return c.sum;
          }),
        }));

        setState({ loading: false, matrix: { rowKeys, colKeys, rows: matrix, rowField: spec.rowField, columnField: spec.columnField }, error: null });
      } catch (e) {
        if (!cancelled) setState({ loading: false, matrix: null, error: e.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [spec?.datasetId, spec?.rowField, spec?.columnField, JSON.stringify(spec?.measures ?? [])]);

  if (state.loading) return <div className="flex h-full items-center justify-center text-xs text-slate-400">Working it out…</div>;
  if (state.error) return <div className="flex h-full items-center justify-center px-4 text-center text-xs text-red-500">{state.error}</div>;
  if (!state.matrix) return <div className="flex h-full items-center justify-center text-xs text-slate-400">Nothing to show yet</div>;

  const { rowKeys, colKeys, rows, rowField, columnField } = state.matrix;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-semibold text-slate-600">
              {rowField} \ {columnField}
            </th>
            {colKeys.map((ck) => (
              <th key={ck} className="whitespace-nowrap border-b border-slate-200 px-2 py-1.5 text-right font-semibold text-slate-600">
                {ck}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKeys[i]} className="hover:bg-brand-50/40">
              <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-100 bg-white px-2 py-1.5 font-medium text-slate-700">
                {rowKeys[i]}
              </td>
              {row.cells.map((v, j) => (
                <td key={j} className={`whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-right tabular-nums ${v !== null && v > 0 ? 'bg-brand-50/60' : ''} text-slate-700`}>
                  {v === null ? <span className="text-slate-300">—</span> : formatNumber(Math.round(v * 100) / 100)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rowKeys.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">No combinations found in the data.</p>
      )}
    </div>
  );
}
