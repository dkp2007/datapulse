import { useEffect } from 'react';

const btn = {
  base: 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed',
  sizes: {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  },
  variants: {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  },
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <button className={`${btn.base} ${btn.sizes[size]} ${btn.variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = '', children }) {
  return <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>{children}</div>;
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onMouseDown={onClose}>
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto`}
        onMouseDown={(e) => e.stopPropagation()}
     >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function EmptyState({ icon = '📊', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {hint && <p className="text-sm text-slate-500 mt-1 max-w-md">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-red-400 hover:text-red-600 font-bold leading-none">
          ×
        </button>
      )}
    </div>
  );
}
