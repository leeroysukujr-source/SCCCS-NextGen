import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: '#0d1117',
          color: '#c9d1d9'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f85149' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '1rem', color: '#8b949e' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Reload Page
          </button>
          <details style={{ marginTop: '2rem', maxWidth: '800px' }}>
            <summary style={{ cursor: 'pointer', color: '#8b949e', marginBottom: '1rem' }}>
              Error Details
            </summary>
            <pre style={{
              background: '#161b22',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              color: '#c9d1d9',
              fontSize: '0.875rem'
            }}>
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

