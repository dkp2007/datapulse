import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

const STYLES = {
  success: { ring: 'border-emerald-200', icon: '✅', bar: 'bg-emerald-500' },
  error: { ring: 'border-red-200', icon: '⚠️', bar: 'bg-red-500' },
  info: { ring: 'border-brand-200', icon: '💡', bar: 'bg-brand-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, kind = 'success') => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, kind }]);
      timers.current[id] = setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const s = STYLES[t.kind] ?? STYLES.info;
          return (
            <div
              key={t.id}
              className={`animate-slide-up pointer-events-auto flex items-stretch overflow-hidden rounded-xl border bg-white shadow-lg ${s.ring}`}
            >
              <div className={`w-1 shrink-0 ${s.bar}`} />
              <div className="flex flex-1 items-start gap-2 px-3 py-2.5">
                <span className="text-sm">{s.icon}</span>
                <p className="flex-1 text-sm text-slate-700">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-slate-300 transition-colors hover:text-slate-600"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
