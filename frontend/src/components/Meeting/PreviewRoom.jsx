import { useState, useEffect, useRef } from 'react'
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiSettings, FiCheck } from 'react-icons/fi'
import './PreviewRoom.css'

export default function PreviewRoom({ onJoin, onCancel, roomTitle }) {
    const [stream, setStream] = useState(null)
    const [audioEnabled, setAudioEnabled] = useState(true)
    const [videoEnabled, setVideoEnabled] = useState(true)
    const [error, setError] = useState(null)
    const [audioLevel, setAudioLevel] = useState(0)
    const videoRef = useRef(null)
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const sourceRef = useRef(null)
    const animationFrameRef = useRef(null)

    useEffect(() => {
        startPreview()
        return () => stopPreview()
    }, [])

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
        }

        // Toggle tracks based on state
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = audioEnabled
            })
            stream.getVideoTracks().forEach(track => {
                track.enabled = videoEnabled
            })
        }
    }, [stream, audioEnabled, videoEnabled])

    const startPreview = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: true
            })
            setStream(mediaStream)
            setupAudioVisualizer(mediaStream)
            setError(null)
        } catch (err) {
            console.error('Error accessing media:', err)
            setError('Could not access camera or microphone. Please check permissions.')
            // Try audio only if video fails
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
                setStream(audioStream)
                setupAudioVisualizer(audioStream)
                setVideoEnabled(false)
                setError('Camera access failed, but audio is working.')
            } catch (audioErr) {
                setError('Could not access camera or microphone.')
            }
        }
    }

    const stopPreview = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
        }
    }

    const setupAudioVisualizer = (currentStream) => {
        if (!currentStream.getAudioTracks().length) return

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const analyser = audioContext.createAnalyser()
            const source = audioContext.createMediaStreamSource(currentStream)

            source.connect(analyser)
            analyser.fftSize = 256
            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            audioContextRef.current = audioContext
            analyserRef.current = analyser
            sourceRef.current = source

            const updateLevel = () => {
                if (!analyserRef.current) return
                analyserRef.current.getByteFrequencyData(dataArray)

                let sum = 0
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i]
                }
                const average = sum / bufferLength
                // Normalize to 0-100 range roughly
                setAudioLevel(Math.min(100, average * 2.5))

                animationFrameRef.current = requestAnimationFrame(updateLevel)
            }

            updateLevel()
        } catch (e) {
            console.warn('Audio visualization setup failed', e)
        }
    }

    const handleJoin = () => {
        // Stop local preview tracks so the main Meeting component can claim them fresh
        stopPreview()
        onJoin({ audioEnabled, videoEnabled })
    }

    return (
        <div className="preview-room-overlay">
            <div className="preview-card">
                <div className="preview-header">
                    <h2>Ready to join?</h2>
                    {roomTitle && <p className="room-name">{roomTitle}</p>}
                </div>

                <div className="preview-video-container">
                    {videoEnabled && !error ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="preview-video mirror"
                        />
                    ) : (
                        <div className="preview-placeholder">
                            <div className="avatar-placeholder">
                                {error ? '!' : 'Camera Off'}
                            </div>
                        </div>
                    )}

                    {error && <div className="preview-error">{error}</div>}

                    <div className="preview-controls">
                        <button
                            className={`preview-btn ${!audioEnabled ? 'off' : ''}`}
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
                        >
                            {audioEnabled ? <FiMic /> : <FiMicOff />}
                            <div
                                className="mic-level-indicator"
                                style={{ height: `${audioEnabled ? audioLevel : 0}%` }}
                            />
                        </button>
                        <button
                            className={`preview-btn ${!videoEnabled ? 'off' : ''}`}
                            onClick={() => setVideoEnabled(!videoEnabled)}
                            title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                        >
                            {videoEnabled ? <FiVideo /> : <FiVideoOff />}
                        </button>
                    </div>
                </div>

                <div className="preview-actions">
                    <button className="join-now-btn" onClick={handleJoin}>
                        Join Now
                    </button>
                    <button className="cancel-join-btn" onClick={onCancel}>
                        Cancel
                    </button>
                </div>

                <div className="preview-footer">
                    <button className="settings-link">
                        <FiSettings /> Check Audio/Video Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
