import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { seriesToChartData } from '../lib/widgets.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function ChartWidget({ spec, data, error, onPointClick }) {

  const AGG_WORDS = {
    sum: 'add up',
    avg: 'average',
    count: 'count rows',
    count_distinct: 'count unique',
    min: 'lowest',
    max: 'highest',
  };

  const isMoney = (spec?.measures ?? []).some(
    (m) => m.field && /revenue|price|amount|cost|sales|income|profit|salary|budget/i.test(m.field)
  );
  const rupee = (v) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(v)}`;

  const chartData = useMemo(() => {
    if (!data || data.kind !== 'series') return null;
    const type = spec?.chartType ?? 'bar';
    const fill = type === 'area';
    const cd = seriesToChartData(data, { fill });
    (spec?.measures ?? []).forEach((m, i) => {
      if (cd.datasets[i]) cd.datasets[i].label = `${AGG_WORDS[m.agg] ?? m.agg} · ${m.field || 'rows'}`;
    });
    return cd;
  }, [data, spec]);

  if (error) {
    return <div className="flex h-full items-center justify-center px-4 text-center text-xs text-red-500">{error}</div>;
  }
  if (!chartData) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-400">Nothing to show yet</div>;
  }

  const type = spec?.chartType ?? 'bar';
  const isPieLike = type === 'pie' || type === 'doughnut';

  const handleClick = (evt, elements) => {
    if (!onPointClick || !elements?.length) return;
    const el = elements[0];
    const label = chartData.labels?.[el.index];
    if (label !== undefined && onPointClick) onPointClick(String(label));
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: type === 'bar-h' ? 'y' : 'x',
    onClick: onPointClick ? handleClick : undefined,
    plugins: {
      legend: { display: isPieLike || chartData.datasets.length > 1, position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const raw = Number(ctx.parsed[isPieLike ? undefined : ctx.dataset.indexAxis === 'y' ? 'x' : 'y'] ?? ctx.parsed);
            const val = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(raw);
            return `${ctx.dataset.label}: ${isMoney ? `₹${val}` : val}`;
          },
        },
      },
    },
    scales: isPieLike
      ? undefined
      : {
          x: {
            stacked: type === 'stacked',
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 45 },
          },
          y: {
            stacked: type === 'stacked',
            ticks: { font: { size: 10 }, beginAtZero: true },
          },
        },
  };

  const props = { data: chartData, options };
  if (type === 'line' || type === 'area') return <Line {...props} />;
  if (type === 'pie') return <Pie {...props} />;
  if (type === 'doughnut') return <Doughnut {...props} />;
  return <Bar {...props} />;
}
