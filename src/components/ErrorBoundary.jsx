import { Component } from 'react'

/**
 * ErrorBoundary - Componente que atrapa errores en sus componentes hijos
 * y muestra una pantalla de respaldo en lugar de tumbar toda la aplicación.
 * 
 * Uso:
 *   <ErrorBoundary>
 *     <MiComponente />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar la UI de fallback
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Registra el error para debugging
    console.error('ErrorBoundary atrapó un error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    // Reinicia el estado para intentar renderizar de nuevo
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // UI de fallback personalizada
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>¡Algo salió mal! 😔</h1>
            <p>Ha ocurrido un error inesperado en la aplicación.</p>
            <p className="error-boundary-detail">
              No te preocupes, tu trabajo está guardado. Intenta recargar la página.
            </p>
            <div className="error-boundary-actions">
              <button onClick={this.handleReset} className="btn btn-primary">
                Intentar de nuevo
              </button>
              <button onClick={() => window.location.reload()} className="btn btn-secondary">
                Recargar página
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-trace">
                <summary>Ver detalles del error (desarrollo)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
