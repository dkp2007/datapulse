

export const AGGREGATES = ['sum', 'avg', 'count', 'count_distinct', 'min', 'max'];
export const CHART_TYPES = ['bar', 'bar-h', 'line', 'area', 'pie', 'doughnut', 'stacked', 'combo'];
export const DATE_GRAINS = ['day', 'week', 'month', 'quarter', 'year'];

export function newWidgetSpec(widgetType) {
  if (widgetType === 'kpi') {
    return { datasetId: null, field: null, agg: 'sum', comparePrev: false, dateField: null, dateFrom: '', dateTo: '', filters: [] };
  }
  if (widgetType === 'table') {
    return { datasetId: null, columns: [] };
  }
  return {
    chartType: 'bar',
    datasetId: null,
    dimension: null,
    dimensionType: 'text',
    dateGrain: 'month',
    measures: [],
    filters: [],
    limit: 100,
  };
}

export function defaultLayout(position) {
  return { x: (position % 2) * 6, y: Math.floor(position / 2) * 4, w: 6, h: 4 };
}

export function validateSpec(widgetType, spec) {
  if (!spec?.datasetId) return 'Pick your data first';
  if (widgetType === 'kpi') {
    if (!spec.agg || !AGGREGATES.includes(spec.agg)) return 'Pick something to show';
    if (spec.agg !== 'count' && !spec.field) return 'Pick which column to show';
    if (spec.comparePrev && !spec.dateField) return 'To compare with the time before, pick a date column';
  }
  if (widgetType === 'chart') {
    if (!spec.dimension) return 'Pick how to split things up';
    if (!Array.isArray(spec.measures) || spec.measures.length === 0) return 'Pick at least one thing to show';
    for (const m of spec.measures) {
      if (!AGGREGATES.includes(m.agg)) return 'Pick something to show';
      if (m.agg !== 'count' && !m.field) return 'Pick which column to show';
    }
  }
  if (widgetType === 'table') {
    if (!Array.isArray(spec.columns) || spec.columns.length === 0) return 'Tick at least one column to show';
  }
  if (widgetType === 'pivot') {
    if (!spec.rowField) return 'Pick how to split the rows';
    if (!spec.columnField) return 'Pick how to split across the top';
    if (!Array.isArray(spec.measures) || spec.measures.length === 0) return 'Pick at least one thing to show';
    for (const m of spec.measures) {
      if (!AGGREGATES.includes(m.agg)) return 'Pick something to show';
      if (m.agg !== 'count' && !m.field) return 'Pick which column to show';
    }
  }
  return null;
}

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6',
  '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#64748b',
];

export const PALETTE_COLORS = PALETTE;

export function seriesToChartData(result, { horizontal = false, fill = false } = {}) {
  const rows = result?.kind === 'series' ? result.rows ?? [] : [];
  const labels = rows.map((r) => r.dimension);
  const measureCount = rows[0]?.values?.length ?? 0;
  const datasets = Array.from({ length: measureCount }, (_, m) => ({
    label: `Measure ${m + 1}`,
    data: rows.map((r) => r.values?.[m] ?? null),
    backgroundColor: m === 0 && measureCount === 1
      ? labels.map((_, i) => PALETTE[i % PALETTE.length])
      : PALETTE[m % PALETTE.length],
    borderColor: m === 0 && measureCount === 1
      ? labels.map((_, i) => PALETTE[i % PALETTE.length])
      : PALETTE[m % PALETTE.length],
    borderWidth: fill ? 1 : 2,
    fill,
    tension: 0.3,
  }));
  return { labels, datasets, horizontal };
}

export function seriesToTableRows(result) {
  const rows = result?.kind === 'series' ? result.rows ?? [] : [];
  return rows.map((r, i) => ({ _key: i, dimension: r.dimension, values: r.values ?? [] }));
}

export function formatNumber(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

export function formatDeltaPct(deltaPct) {
  if (deltaPct === null || deltaPct === undefined) return null;
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${Number(deltaPct).toFixed(1)}%`;
}
