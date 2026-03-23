/* LiveCaptions.jsx */
import React, { useEffect, useState, useRef } from 'react'
import { FaHeadphones, FaMicrophone, FaSignal } from 'react-icons/fa'

export default function LiveCaptions({ wsUrl = 'ws://localhost:8001/ws/caption/default' }) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState({})
  const wsRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      setConnected(true)
      console.log('[LiveCaptions] Connected to', wsUrl)
    }
    
    ws.onmessage = (ev) => {
      try {
        const json = JSON.parse(ev.data)
        // Track participant colors and metadata
        if (json.participant_id && !participants[json.participant_id]) {
          const colors = [
            'from-blue-500 to-indigo-600', 
            'from-purple-500 to-pink-600', 
            'from-emerald-500 to-teal-600', 
            'from-amber-500 to-orange-600', 
            'from-cyan-500 to-blue-600'
          ]
          setParticipants(p => ({
            ...p,
            [json.participant_id]: colors[Object.keys(p).length % colors.length]
          }))
        }
        
        setMessages((m) => {
          // If interim, replace the last interim message from the same participant
          if (json.interim) {
              const last = m[0]
              if (last && last.interim && last.participant_id === json.participant_id) {
                  return [json, ...m.slice(1)]
              }
          }
          return [json, ...m].slice(0, 50)
        })
      } catch (e) {
        console.error('Parse error:', e)
      }
    }
    
    ws.onclose = () => setConnected(false)
    ws.onerror = (err) => {
      console.error('[LiveCaptions] WebSocket error:', err)
      setConnected(false)
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close()
    }
  }, [wsUrl])

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
    }
  }, [messages])

  return (
    <div className="relative flex flex-col h-full bg-slate-950/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl group/captions">
      {/* Glossy Header */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <FaMicrophone className={`${connected ? 'text-emerald-400' : 'text-slate-600'} text-xs`} />
            {connected && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
            Realtime Transcription
          </span>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {connected ? 'CORE_ENGINE ACTIVE' : 'DISCONNECTED'}
            </span>
            <FaSignal className={`text-[10px] ${connected ? 'text-emerald-400' : 'text-slate-700'}`} />
        </div>
      </div>

      {/* Captions Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col-reverse"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover/captions:border-indigo-500/30 transition-all duration-700">
                <FaHeadphones className="text-slate-600 group-hover/captions:text-indigo-400/50" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Waiting for acoustic data stream...</p>
          </div>
        )}

        {messages.map((m, idx) => (
          <div 
            key={idx} 
            className={`animate-slideInUp ${m.interim ? 'opacity-60' : 'opacity-100'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${participants[m.participant_id] || 'from-slate-700 to-slate-800'} flex items-center justify-center text-[10px] font-bold text-white shadow-lg shrink-0`}>
                {m.participant_id?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">
                    {m.participant_id || 'System'}
                  </span>
                  {m.interim && (
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-0.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-0.5 h-0.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-0.5 h-0.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                  )}
                </div>
                <div className={`px-3 py-2 rounded-2xl rounded-tl-none border ${
                    m.interim 
                        ? 'bg-slate-800/30 border-white/5 text-slate-400 italic' 
                        : 'bg-white/5 border-white/10 text-slate-200 shadow-xl'
                }`}>
                  <p className="text-xs leading-relaxed font-medium">
                    {m.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Bottom Gradient (Fade out) */}
      <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none"></div>
    </div>
  )
}
