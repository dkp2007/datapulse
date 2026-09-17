import { formatDeltaPct, formatNumber } from '../lib/widgets.js';

export default function KpiWidget({ data, error }) {
  if (error) {
    return <div className="flex h-full items-center justify-center px-4 text-center text-xs text-red-500">{error}</div>;
  }
  if (!data || data.kind !== 'scalar') {
    return <div className="flex h-full items-center justify-center text-xs text-slate-400">Nothing to show yet</div>;
  }

  const delta = formatDeltaPct(data.deltaPct);
  const positive = data.deltaPct > 0;
  const negative = data.deltaPct < 0;

  return (
    <div className="flex h-full flex-col justify-center px-2">
      <div className="truncate text-3xl font-bold tracking-tight text-slate-900">
        {formatNumber(data.value)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== null && data.comparePrevHint !== false && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${
              positive ? 'bg-emerald-50 text-emerald-600' : negative ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {positive ? '▲' : negative ? '▼' : '•'} {delta}
          </span>
        )}
        {data.prev !== null && data.prev !== undefined && (
          <span className="truncate text-slate-400">was {formatNumber(data.prev)}</span>
        )}
      </div>
    </div>
  );
}
