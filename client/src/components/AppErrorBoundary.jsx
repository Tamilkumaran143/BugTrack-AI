import React, { Component } from 'react';

export class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled application rendering error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">
              The page could not be rendered. Reload the application or return to the previous page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
            >
              Reload application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
