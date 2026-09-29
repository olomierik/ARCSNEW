import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0d1b2f', color: '#f9faf3', padding: '2rem', textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e86d7a' }}>
            Something went wrong
          </h1>
          <pre style={{
            background: 'rgba(255,255,255,0.07)', padding: '1rem', borderRadius: '8px',
            fontSize: '0.75rem', maxWidth: '600px', overflowX: 'auto', color: '#cbd5e1'
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem', padding: '0.5rem 1.5rem', borderRadius: '8px',
              background: '#acc6e9', color: '#0d1b2f', border: 'none', cursor: 'pointer', fontWeight: 600
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
