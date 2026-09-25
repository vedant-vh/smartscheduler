// @ts-nocheck
import React from 'react';

/**
 * ErrorBoundary
 * Wraps any subtree and catches render-time errors, displaying a friendly
 * fallback UI instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyPage />
 *   </ErrorBoundary>
 *
 *   or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something broke.</p>}>
 *     <MyPage />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production you would send this to an error-tracking service (e.g. Sentry)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: '400px' }}>
            This page encountered an unexpected error. You can try refreshing or go
            back to the dashboard.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.assign('/dashboard')}
              style={{
                padding: '0.5rem 1.25rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Go to Dashboard
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '1.5rem', textAlign: 'left', maxWidth: '600px', width: '100%' }}>
              <summary style={{ cursor: 'pointer', color: '#9ca3af', fontSize: '0.875rem' }}>
                Error details (dev only)
              </summary>
              <pre style={{ fontSize: '0.75rem', color: '#ef4444', background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', marginTop: '0.5rem' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

