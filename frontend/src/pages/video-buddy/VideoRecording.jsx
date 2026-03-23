import React, { useEffect, useRef, useState } from 'react'
import '../../pages/VideoBuddy.css'
import './VideoRecording.css'
import { filesAPI } from '../../api/files'
import { useNotify } from '../../components/NotificationProvider'
import { FaMicrophone, FaStop, FaTimes, FaDownload, FaCloudUploadAlt, FaTrash } from 'react-icons/fa'

export default function VideoRecording(){
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState([]) // {file, url, name, size, mime, createdAt}
  const [timer, setTimer] = useState('00:00')
  const mediaRecorderRef = useRef(null)
  const audioStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const rafRef = useRef(null)
  const analyserRef = useRef(null)
  const canvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const startTsRef = useRef(null)
  const notify = useNotify()

  const formatTime = (ms) => {
    const s = Math.floor(ms/1000)
    const mm = String(Math.floor(s/60)).padStart(2,'0')
    const ss = String(s%60).padStart(2,'0')
    return `${mm}:${ss}`
  }

  const drawWaveform = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const bufferLength = analyser.fftSize
    const dataArray = new Float32Array(bufferLength)
    analyser.getFloatTimeDomainData(dataArray)
    ctx.fillStyle = '#f7fbff'
    ctx.fillRect(0,0,width,height)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#2b6cb0'
    ctx.beginPath()
    const sliceWidth = width / bufferLength
    let x = 0
    for (let i=0;i<bufferLength;i++){
      const v = dataArray[i] * 0.5 + 0.5
      const y = v * height
      if (i===0) ctx.moveTo(x,y)
      else ctx.lineTo(x,y)
      x += sliceWidth
    }
    ctx.lineTo(width, height/2)
    ctx.stroke()
    rafRef.current = requestAnimationFrame(drawWaveform)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      // setup audio context + analyser
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      // start drawing
      drawWaveform()

      // prefer webm/opus if available
      let mime = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime = 'audio/webm;codecs=opus'
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mime = 'audio/ogg;codecs=opus'

      const options = { mimeType: mime }
      let mr
      try {
        mr = new MediaRecorder(stream, options)
      } catch (e) {
        mr = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = mr
      audioChunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const ext = mr.mimeType && mr.mimeType.includes('ogg') ? 'ogg' : (mr.mimeType && mr.mimeType.includes('mp4') ? 'mp4' : 'webm')
        const filename = `recording-${Date.now()}.${ext}`
        const file = new File([blob], filename, { type: blob.type })
        const url = URL.createObjectURL(blob)
        const r = { file, url, name: filename, size: blob.size, mime: blob.type, createdAt: new Date().toISOString() }
        setRecordings(prev => [r, ...prev])
        // cleanup audio tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t=>t.stop())
          audioStreamRef.current = null
        }
        if (audioContextRef.current) {
          try { audioContextRef.current.close() } catch(e){}
          audioContextRef.current = null
        }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        setIsRecording(false)
        setTimer('00:00')
      }

      mr.start()
      setIsRecording(true)
      startTsRef.current = Date.now()
      const tick = () => {
        const diff = Date.now() - startTsRef.current
        setTimer(formatTime(diff))
        if (isRecording) setTimeout(tick, 500)
      }
      tick()

    } catch (err) {
      console.error('Recording error', err)
      notify('error', 'Could not start recording — check microphone permissions')
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.stop()
    }
  }

  const cancelRecording = () => {
    // stop and discard
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t=>t.stop())
    audioChunksRef.current = []
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch(e){}
      audioContextRef.current = null
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    setIsRecording(false)
    setTimer('00:00')
  }

  const downloadRecording = (r) => {
    const link = document.createElement('a')
    link.href = r.url
    link.download = r.name
    document.body.appendChild(link)
    link.click()
    setTimeout(()=>{document.body.removeChild(link)},100)
  }

  const removeRecording = (idx) => {
    setRecordings(prev => prev.filter((_,i)=>i!==idx))
  }

  const uploadRecording = async (r, idx) => {
    try {
      notify('info','Uploading...')
      const data = await filesAPI.uploadFile(r.file)
      notify('success','Uploaded')
      // Optionally mark uploaded in UI
      setRecordings(prev => prev.map((rr,i)=> i===idx ? ({...rr, uploaded: true, serverFile: data}) : rr))
    } catch (err) {
      console.error('Upload failed', err)
      notify('error','Upload failed')
    }
  }

  useEffect(()=>{
    // cleanup objectURLs on unmount
    return ()=>{
      recordings.forEach(r=>{ if (r.url) URL.revokeObjectURL(r.url) })
    }
  },[recordings])

  return (
    <div className="vb-record-root">
      <div className="vb-record-left card">
        <h3>Recording Studio</h3>
        <p className="muted">Create voice recordings, download or upload them to the server.</p>

        <div className="rec-stage">
          <canvas ref={canvasRef} className="rec-canvas" width={800} height={120} />
          <div className="rec-controls">
            <div className="rec-timer">{timer}</div>
            {!isRecording ? (
              <button className="rec-btn record" onClick={startRecording} title="Record" aria-label="Record">
                <FaMicrophone />
              </button>
            ) : (
              <>
                <button className="rec-btn stop" onClick={stopRecording} title="Stop" aria-label="Stop">
                  <FaStop />
                </button>
                <button className="rec-btn cancel" onClick={cancelRecording} title="Cancel" aria-label="Cancel">
                  <FaTimes />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="recent-label">Recent Recordings</div>
        <div className="recordings-list">
          {recordings.length===0 && <div className="vb-center muted">No recordings yet</div>}
          {recordings.map((r,idx)=> (
            <div key={r.name+idx} className="recording-item">
              <audio controls src={r.url} />
              <div className="record-meta">
                <div>{r.name}</div>
                <div className="muted small">{(r.size/1024).toFixed(1)} KB • {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="record-actions">
                <button className="vb-action small" onClick={()=>downloadRecording(r)} title="Download" aria-label="Download"><FaDownload /></button>
                <button className="vb-action small" onClick={()=>uploadRecording(r, idx)} disabled={r.uploaded} title="Upload" aria-label="Upload"><FaCloudUploadAlt /></button>
                <button className="vb-action small" onClick={()=>removeRecording(idx)} title="Delete" aria-label="Delete"><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="vb-record-right card">
        <h4>Tips & Quick Actions</h4>
        <ul>
          <li>Use the large <strong>Record</strong> button to begin.</li>
          <li>While recording you can stop or cancel the take.</li>
          <li>Upload to the server for sharing or attach in chat.</li>
        </ul>

        <div style={{marginTop:12}}>
          <button className="vb-action" onClick={()=>notify('info','Coming soon: batch upload & share')}>Batch upload</button>
        </div>
      </div>
    </div>
  )
}
