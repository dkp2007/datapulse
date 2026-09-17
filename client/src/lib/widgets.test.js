import { describe, expect, it } from 'vitest';
import {
  AGGREGATES,
  CHART_TYPES,
  defaultLayout,
  formatDeltaPct,
  formatNumber,
  newWidgetSpec,
  seriesToChartData,
  seriesToTableRows,
  validateSpec,
} from './widgets.js';

describe('newWidgetSpec', () => {
  it('creates chart spec with defaults', () => {
    const s = newWidgetSpec('chart');
    expect(s.chartType).toBe('bar');
    expect(s.measures).toEqual([]);
    expect(s.dimensionType).toBe('text');
  });
  it('creates kpi spec', () => {
    const s = newWidgetSpec('kpi');
    expect(s.agg).toBe('sum');
    expect(s.comparePrev).toBe(false);
  });
  it('creates table spec', () => {
    expect(newWidgetSpec('table').columns).toEqual([]);
  });
});

describe('defaultLayout', () => {
  it('places widgets in two columns', () => {
    expect(defaultLayout(0)).toEqual({ x: 0, y: 0, w: 6, h: 4 });
    expect(defaultLayout(1)).toEqual({ x: 6, y: 0, w: 6, h: 4 });
    expect(defaultLayout(2)).toEqual({ x: 0, y: 4, w: 6, h: 4 });
  });
});

describe('validateSpec', () => {
  it('requires a dataset for every type', () => {
    expect(validateSpec('chart', newWidgetSpec('chart'))).toBe('Pick your data first');
    expect(validateSpec('kpi', newWidgetSpec('kpi'))).toBe('Pick your data first');
    expect(validateSpec('table', newWidgetSpec('table'))).toBe('Pick your data first');
  });

  it('validates chart specs', () => {
    const s = newWidgetSpec('chart');
    s.datasetId = 'ds1';
    expect(validateSpec('chart', s)).toBe('Pick how to split things up');
    s.dimension = 'region';
    expect(validateSpec('chart', s)).toBe('Pick at least one thing to show');
    s.measures = [{ agg: 'sum', field: 'revenue' }];
    expect(validateSpec('chart', s)).toBeNull();
    s.measures = [{ agg: 'bogus', field: 'revenue' }];
    expect(validateSpec('chart', s)).toBe('Pick something to show');
    s.measures = [{ agg: 'count', field: null }];
    expect(validateSpec('chart', s)).toBeNull();
  });
});

describe('formatNumber', () => {
  it('formats numbers with thousands separators', () => {
    expect(formatNumber(1234567.5)).toBe('12,34,567.5');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1234567)).toBe('12,34,567');
  });
  it('renders blanks and non-numbers safely', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber('abc')).toBe('abc');
  });
});

describe('formatDeltaPct', () => {
  it('signs and rounds percentages', () => {
    expect(formatDeltaPct(12.34)).toBe('+12.3%');
    expect(formatDeltaPct(-5)).toBe('-5.0%');
    expect(formatDeltaPct(0)).toBe('0.0%');
  });
  it('returns null for missing values', () => {
    expect(formatDeltaPct(null)).toBeNull();
    expect(formatDeltaPct(undefined)).toBeNull();
  });
});

describe('seriesToChartData', () => {
  const result = {
    kind: 'series',
    dimension: 'month',
    rows: [
      { dimension: '2026-01', values: [100, 4] },
      { dimension: '2026-02', values: [150, 5] },
      { dimension: '2026-03', values: [125, 4] },
    ],
  };

  it('builds one Chart.js dataset per measure', () => {
    const { labels, datasets } = seriesToChartData(result);
    expect(labels).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(datasets).toHaveLength(2);
    expect(datasets[0].data).toEqual([100, 150, 125]);
    expect(datasets[1].data).toEqual([4, 5, 4]);
  });

  it('colors a single-measure chart per bar', () => {
    const single = { kind: 'series', rows: result.rows.map((r) => ({ dimension: r.dimension, values: [r.values[0]] })) };
    const { datasets } = seriesToChartData(single);
    expect(datasets[0].backgroundColor).toHaveLength(3);
  });

  it('handles empty results', () => {
    const { labels, datasets } = seriesToChartData({ kind: 'series', rows: [] });
    expect(labels).toEqual([]);
    expect(datasets).toEqual([]);
  });
});

describe('seriesToTableRows', () => {
  it('maps RPC rows for table rendering', () => {
    const rows = seriesToTableRows({ kind: 'series', rows: [{ dimension: 'EMEA', values: [10] }] });
    expect(rows).toEqual([{ _key: 0, dimension: 'EMEA', values: [10] }]);
  });
});
