import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorType: null
    }
  }

  static getDerivedStateFromError(error) {
    const errorMsg = error?.message || ''
    const isChunkError = errorMsg.includes('Failed to fetch dynamically imported module') || 
                        errorMsg.includes('Loading chunk') || 
                        errorMsg.includes('module not found')
    
    return { 
      hasError: true, 
      error,
      errorType: isChunkError ? 'CHUNK_ERROR' : 'APP_ERROR'
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Automatically reload once if it's a chunk error (stale version)
    const errorMsg = error?.message || ''
    if (errorMsg.includes('Failed to fetch dynamically imported module')) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reloaded')
      if (!hasReloaded) {
          sessionStorage.setItem('chunk_error_reloaded', 'true')
          console.warn('Chunk error detected. Auto-reloading to fetch new version...')
          window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.errorType === 'CHUNK_ERROR'

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
          color: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '3rem',
            borderRadius: '24px',
            textAlign: 'center',
            maxWidth: '600px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800
            }}>
              {isChunkError ? 'Update Required' : 'Oops!'}
            </div>
            
            <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 700 }}>
              {isChunkError ? 'A new version is available' : 'Something went wrong'}
            </h1>
            
            <p style={{ marginBottom: '2rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {isChunkError 
                ? 'We have updated SCCCS with fresh features. Please refresh to ensure everything works perfectly.' 
                : (this.state.error?.message || 'An unexpected error occurred in the application.')}
            </p>

            <button
              onClick={() => {
                sessionStorage.removeItem('chunk_error_reloaded')
                window.location.reload()
              }}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 600,
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              Refresh Interface
            </button>

            {!isChunkError && (
              <details style={{ marginTop: '2.5rem', textAlign: 'left' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: '#64748b', 
                  fontSize: '0.875rem',
                  userSelect: 'none'
                }}>
                  Technical Details
                </summary>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1rem',
                  borderRadius: '12px',
                  marginTop: '1rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: '#fb7185',
                  overflow: 'auto',
                  maxHeight: '150px',
                  border: '1px solid rgba(244, 63, 94, 0.2)'
                }}>
                  {this.state.error?.stack || this.state.error?.toString()}
                </div>
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
