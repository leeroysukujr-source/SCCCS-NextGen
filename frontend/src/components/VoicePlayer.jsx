import { useState, useRef, useEffect } from 'react'
import { FiPlay, FiPause, FiVolume2, FiDownload } from 'react-icons/fi'

export default function VoicePlayer({ url }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState('0:00')
    const [playbackRate, setPlaybackRate] = useState(1)
    const audioRef = useRef(null)

    const togglePlay = () => {
        if (!audioRef.current) return
        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleTimeUpdate = () => {
        const current = audioRef.current.currentTime
        const total = audioRef.current.duration
        if (total) {
            setProgress((current / total) * 100)
            setCurrentTime(formatTime(current))
        }
    }

    const handleEnded = () => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime('0:00')
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    const handleProgressChange = (e) => {
        const newProgress = e.target.value
        const total = audioRef.current.duration
        if (total) {
            audioRef.current.currentTime = (newProgress / 100) * total
            setProgress(newProgress)
        }
    }

    const cycleRate = () => {
        const rates = [1, 1.5, 2]
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
        setPlaybackRate(nextRate)
        audioRef.current.playbackRate = nextRate
    }

    const waveformBars = [40, 60, 45, 70, 85, 40, 30, 50, 65, 80, 55, 40, 60, 75, 50, 35, 45, 60, 40, 30]

    return (
        <div className={`professional-voice-player ${isPlaying ? 'playing' : ''}`}>
            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                preload="metadata"
            />

            <div className="voice-player-main">
                <button className="play-toggle-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <FiPause size={20} fill="currentColor" /> : <FiPlay size={20} style={{ marginLeft: '2px' }} fill="currentColor" />}
                </button>

                <div className="voice-progress-container">
                    <div className="voice-waveform-visual">
                        {waveformBars.map((h, i) => (
                            <div
                                key={i}
                                className="waveform-bar"
                                style={{
                                    height: `${h}%`,
                                    opacity: (i / waveformBars.length) * 100 <= progress ? 1 : 0.3
                                }}
                            />
                        ))}
                    </div>
                    <input
                        type="range"
                        className="voice-seek-bar"
                        value={progress}
                        onChange={handleProgressChange}
                        min="0"
                        max="100"
                    />
                </div>

                <div className="voice-controls-right">
                    <button className="playback-rate-btn" onClick={cycleRate} title="Playback Speed">
                        {playbackRate}x
                    </button>
                    <span className="voice-time-display">{currentTime}</span>
                </div>
            </div>

        </div>
    )
}
