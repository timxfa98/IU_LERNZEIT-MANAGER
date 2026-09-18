import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Fängt Ausnahmen beim Rendern ab. Ohne diese Grenze nimmt React bei einem
 * Fehler den gesamten Komponentenbaum aus dem DOM – die Anwendung zeigt dann
 * nur noch eine weiße Seite ohne jeden Hinweis auf die Ursache.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unerwarteter Fehler:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="card">
        <h3>Es ist ein Fehler aufgetreten</h3>
        <p className="form-desc">
          Dieser Bereich konnte nicht angezeigt werden. Die übrige Anwendung ist
          weiterhin nutzbar – wechsle einfach auf einen anderen Reiter.
        </p>
        <pre className="error-detail">{this.state.error.message}</pre>
        <button className="btn-secondary" onClick={() => this.setState({ error: null })}>
          Erneut versuchen
        </button>
      </div>
    )
  }
}
