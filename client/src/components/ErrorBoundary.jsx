import { Component } from 'react';
import { Logo } from './Brand.jsx';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4 text-center">
        <Logo size={52} className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          An unexpected error stopped the page. Refreshing usually fixes it — your data is safe.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Refresh the page
        </button>
      </div>
    );
  }
}
