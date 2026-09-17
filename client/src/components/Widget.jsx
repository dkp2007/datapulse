import { Card } from './ui.jsx';
import ChartWidget from './ChartWidget.jsx';
import KpiWidget from './KpiWidget.jsx';
import TableWidget from './TableWidget.jsx';
import PivotWidget from './PivotWidget.jsx';

export default function Widget({ widget, data, loading, error, onEdit, onRemove, onPointClick }) {
  const { widget_type: type, title } = widget;

  let body;
  if (type === 'chart') {
    body = loading ? (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">Checking the numbers…</div>
    ) : (
      <ChartWidget spec={widget.spec} data={data} error={error} onPointClick={onPointClick} />
    );
  } else if (type === 'pivot') {
    body = <PivotWidget spec={widget.spec} />;
  } else if (type === 'kpi') {
    body = loading ? (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">Checking the numbers…</div>
    ) : (
      <KpiWidget data={data} error={error} />
    );
  } else {
    body = <TableWidget spec={widget.spec} />;
  }

  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <div className="widget-drag-handle flex cursor-move items-center justify-between gap-2 px-4 pt-3">
        <h3 className="truncate text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
            title="Edit tile"
            onClick={onEdit}
          >
            ✏️
          </button>
          <button
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Take off the board"
            onClick={onRemove}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3">{body}</div>
    </Card>
  );
}
