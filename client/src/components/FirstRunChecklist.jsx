import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './ui.jsx';

const STEPS = [
  { key: 'file', label: 'Add your first file of data', hint: 'A spreadsheet with your sales, expenses — anything.', to: '/datasets/import', cta: 'Add a file' },
  { key: 'board', label: 'Make your first board', hint: 'A wall where your charts and big numbers live.', to: '/boards', cta: 'Go to boards' },
  { key: 'tile', label: 'Pin a number or chart', hint: 'Open a board and add your first tile.', to: '/boards', cta: 'Open boards' },
  { key: 'details', label: 'Fill in your business details', hint: 'Name, GST, address — used on invoices and reports.', to: '/settings', cta: 'Open settings' },
];

export function readChecklistState({ files, boards, tiles, profileDone }) {
  return {
    file: files > 0,
    board: boards > 0,
    tile: tiles > 0,
    details: profileDone >= 100,
  };
}

export default function FirstRunChecklist({ files, boards, tiles, profileDone }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('dp_checklist_dismissed') === '1');
  const done = readChecklistState({ files, boards, tiles, profileDone });
  const doneCount = Object.values(done).filter(Boolean).length;
  const allDone = doneCount === STEPS.length;

  if (dismissed) return null;
  if (allDone) return null;

  function hide() {
    setDismissed(true);
    sessionStorage.setItem('dp_checklist_dismissed', '1');
  }

  return (
    <Card className="mb-6 overflow-hidden border-brand-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-brand-50 to-transparent px-5 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {allDone ? '🎉 All set — everything is in place!' : 'Get started — 4 small steps'}
          </h3>
          <p className="text-xs text-slate-400">
            {allDone ? 'You know your way around now. Happy tracking!' : 'Do these once and the app feels like yours.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-brand-700">{doneCount}/4</span>
          <button onClick={hide} className="text-xs text-slate-400 hover:text-slate-600" title="Hide for now">✕</button>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {STEPS.map((s) => {
          const isDone = done[s.key];
          return (
            <div
              key={s.key}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                isDone ? 'border-green-100 bg-green-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? '✓' : ''}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{s.label}</div>
                {!isDone && (
                  <>
                    <p className="text-xs text-slate-400">{s.hint}</p>
                    <Link to={s.to} className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:underline">
                      {s.cta} →
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
