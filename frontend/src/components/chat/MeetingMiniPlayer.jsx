import React, { useState, useEffect } from 'react';
import { 
    LiveKitRoom, 
    ParticipantTile, 
    useParticipants, 
    useTracks,
    RoomAudioRenderer,
    TrackReferenceOrPlaceholder
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { FaExpand, FaTimes, FaMicrophoneSlash, FaVideoSlash, FaHandPaper } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '../contexts/MeetingContext';
import './MeetingMiniPlayer.css';

const MeetingMiniPlayer = () => {
    const { activeMeeting, setMinimized, leaveMeeting } = useMeeting();
    const navigate = useNavigate();

    if (!activeMeeting || !activeMeeting.isMinimized) return null;

    return (
        <div className="meeting-mini-player-wrapper">
            <LiveKitRoom
                token={activeMeeting.token}
                serverUrl={activeMeeting.url}
                connect={true}
                className="mini-player-lk-room"
            >
                <MiniPlayerContent 
                    onExpand={() => {
                        setMinimized(false);
                        navigate(`/meeting/${activeMeeting.roomId}`);
                    }}
                    onClose={() => {
                        if (window.confirm("End this meeting?")) {
                            leaveMeeting();
                        }
                    }}
                />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
};

const MiniPlayerContent = ({ onExpand, onClose }) => {
    const participants = useParticipants();
    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: true },
        { source: Track.Source.ScreenShare, withPlaceholder: false }
    ]);

    // Focus on the speaker or screen share
    const speaker = participants.find(p => p.isSpeaking) || participants[0];
    const mainTrack = tracks.find(t => t.source === Track.Source.ScreenShare) || 
                      tracks.find(t => t.participant.identity === speaker?.identity) ||
                      tracks[0];

    return (
        <div className="mini-player-inner">
            <div className="mini-player-video">
                {mainTrack && (
                    <ParticipantTile participant={mainTrack.participant} />
                )}
                
                <div className="mini-player-overlay">
                    <div className="mini-player-header">
                        <span className="mini-participant-count">{participants.length} Active</span>
                        <div className="mini-player-actions">
                            <button onClick={onExpand} title="Expand"><FaExpand /></button>
                            <button onClick={onClose} title="End Meeting" className="close-btn"><FaTimes /></button>
                        </div>
                    </div>
                    
                    <div className="mini-player-footer">
                        <span className="mini-room-name truncate">Live Meeting</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingMiniPlayer;
