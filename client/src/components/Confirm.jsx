import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from './ui.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setDialog(typeof opts === 'string' ? { message: opts } : opts);
    });
  }, []);

  function close(answer) {
    setDialog(null);
    resolver.current?.(answer);
    resolver.current = null;
  }

  const danger = dialog?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={() => close(false)}
        >
          <div
            className="animate-pop-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                  danger ? 'bg-red-50' : 'bg-brand-50'
                }`}
              >
                {dialog.icon ?? (danger ? '🗑' : '❓')}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">{dialog.title ?? 'Just checking'}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{dialog.message}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>
                {dialog.cancelLabel ?? 'Cancel'}
              </Button>
              <button
                onClick={() => close(true)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                  danger
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600/30'
                    : 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-600/30'
                }`}
              >
                {dialog.confirmLabel ?? 'Yes, do it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
