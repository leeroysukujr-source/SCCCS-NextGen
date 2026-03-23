import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [confirmState, setConfirmState] = useState({ open: false, message: null, resolve: null })
  const [promptState, setPromptState] = useState({ open: false, message: null, defaultValue: '', resolve: null })
  const [toasts, setToasts] = useState([])
  const promptInputRef = useRef(null)

  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id))
    }, 5000)
  }, [])

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ open: true, message, resolve })
    })
  }, [])

  const prompt = useCallback((message, defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptState({ open: true, message, defaultValue, resolve })
    })
  }, [])

  const handleConfirm = (result) => {
    try {
      confirmState.resolve && confirmState.resolve(result)
    } catch (e) {
      // ignore
    }
    setConfirmState({ open: false, message: null, resolve: null })
  }

  const handlePrompt = (value) => {
    try {
      promptState.resolve && promptState.resolve(value)
    } catch (e) {
      // ignore
    }
    setPromptState({ open: false, message: null, defaultValue: '', resolve: null })
  }

  return (
    <NotificationContext.Provider value={{ confirm, notify, prompt }}>
      {children}

      {/* Confirm dialog */}
      {confirmState.open && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-overlay)', position: 'absolute', inset: 0 }} />
          <div style={{ background: 'var(--bg-elevated)', padding: 20, borderRadius: 8, boxShadow: '0 6px 18px var(--shadow-lg)', minWidth: 320, zIndex: 10000, color: 'var(--text-primary)' }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>Confirmation</div>
            <div style={{ marginBottom: 18 }}>{confirmState.message}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => handleConfirm(false)} style={{ padding: '6px 12px' }}>Cancel</button>
              <button onClick={() => handleConfirm(true)} style={{ padding: '6px 12px', background: 'var(--gradient-primary)', color: 'var(--white)', border: 'none', borderRadius: 6 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt dialog */}
      {promptState.open && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-overlay)', position: 'absolute', inset: 0 }} />
          <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 8, boxShadow: '0 6px 18px var(--shadow-lg)', minWidth: 360, zIndex: 10000, color: 'var(--text-primary)' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Input</div>
            <div style={{ marginBottom: 8 }}>{promptState.message}</div>
            <input
              ref={promptInputRef}
              type="text"
              defaultValue={promptState.defaultValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePrompt(e.target.value)
                if (e.key === 'Escape') handlePrompt(null)
              }}
              style={{ width: '100%', padding: '8px 10px', marginBottom: 12, borderRadius: 4, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => handlePrompt(null)} style={{ padding: '6px 12px' }}>Cancel</button>
              <button onClick={() => {
                const val = promptInputRef.current ? promptInputRef.current.value : promptState.defaultValue
                handlePrompt(val)
              }} style={{ padding: '6px 12px', background: 'var(--gradient-primary)', color: 'var(--white)', border: 'none', borderRadius: 6 }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9998 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === 'error' ? 'var(--error-light)' : 'var(--bg-elevated)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 6, boxShadow: '0 4px 10px var(--shadow-md)', border: '1px solid var(--border-light)' }}>
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useConfirm must be used within NotificationProvider')
  return ctx.confirm
}

export function useNotify() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider')
  return ctx.notify
}

export function usePrompt() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('usePrompt must be used within NotificationProvider')
  return ctx.prompt
}

export default NotificationProvider
