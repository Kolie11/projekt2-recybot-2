import { Component } from "react";

/**
 * Fängt Fehler in einem Modul ab, damit nicht die ganze App weiß wird.
 * resetKey: ändert sich der Wert (z. B. beim Modulwechsel), wird der Fehler zurückgesetzt.
 */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[RecyBot]", error, info?.componentStack); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { title, text, retry } = this.props.labels;
    return (
      <div className="why warn" role="alert" style={{ marginTop: 24 }}>
        <b>{title}</b>
        <div>{text}</div>
        <details className="mt-s"><summary>Details</summary><code style={{ fontSize: 12 }}>{String(error?.message || error)}</code></details>
        <button className="mt" onClick={() => this.setState({ error: null })}>{retry}</button>
      </div>
    );
  }
}
