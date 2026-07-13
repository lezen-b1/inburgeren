import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NT2 app error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="fatal-error shell">
        <div className="fatal-error__card">
          <span className="eyebrow">Technische fout</span>
          <h1>De site kon niet goed worden geladen</h1>
          <p>
            Controleer of alle bestanden uit de map <code>dist</code> zijn geupload en laad de pagina opnieuw.
          </p>
          <details>
            <summary>Technische details</summary>
            <pre>{this.state.message}</pre>
          </details>
          <button className="button button--primary" onClick={() => window.location.reload()}>
            Opnieuw laden
          </button>
        </div>
      </main>
    );
  }
}
