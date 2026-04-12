import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  LayoutContextProvider,
  useTracks,
  useChat,
  useParticipants,
  useLocalParticipant,
  VideoTrack,
  AudioTrack,
  useRoomContext,
  ParticipantLoop,
  VideoConference
} from '@livekit/components-react';
import { Track, ConnectionState, createLocalVideoTrack, ParticipantEvent, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import {
  FaChalkboardTeacher, FaUsers, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaShieldAlt, FaRegClock, FaSignal, FaVolumeUp, FaDesktop, FaCommentAlt,
  FaSmile, FaEllipsisH, FaTimes, FaPaperPlane, FaCircle, FaPhone, FaHandPaper,
  FaEye, FaEyeSlash, FaCog, FaStopCircle, FaCheckCircle, FaTimesCircle,
  FaVolumeOff, FaCheck, FaBrain, FaSpinner, FaSignOutAlt, FaChartLine, FaRobot, FaLock, FaUser
} from 'react-icons/fa';
import { IoNotifications, IoSwapHorizontal } from 'react-icons/io5';
import { FiShare2, FiChevronDown, FiEdit3, FiFile, FiClock, FiVideo, FiMessageSquare } from 'react-icons/fi';
import AISummaryButton from '../components/AISummaryButton';
import LiveCaptions from '../components/LiveCaptions';
import Whiteboard from './video-buddy/Whiteboard';
import apiClient from '../api/client';
import { roomsAPI } from '../api/rooms';
import BreakoutRoomManager from './video-buddy/BreakoutRoomManager';

export default function MeetingEnhanced({ roomId: propRoomId, onReady }) {
  const { roomId: paramRoomId } = useParams();
  const roomId = propRoomId || paramRoomId;
  const navigate = useNavigate();
  const { user, token: authToken } = useAuthStore();

  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [error, setError] = useState(null);
  const [shouldJoin, setShouldJoin] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [preJoinChoices, setPreJoinChoices] = useState({ videoEnabled: true, audioEnabled: true });
  const [roomInfo, setRoomInfo] = useState(null);
  const [mainRoomId, setMainRoomId] = useState(null);

  useEffect(() => {
    if (shouldJoin && onReady) {
      onReady();
    }
  }, [shouldJoin, onReady]);

  useEffect(() => {
    if (roomId) {
      const fetchInfo = async () => {
        try {
          const res = await apiClient.get(`/rooms/${roomId}`);
          if (res.data) {
            setRoomInfo(res.data);
            if (res.data.is_breakout && res.data.parent_id) {
                setMainRoomId(res.data.parent_id);
            }
          }
        } catch (e) { console.error("Room info fetch failed", e); }
      };
      fetchInfo();
    }
  }, [roomId]);

  const handleJoinMeeting = async (choices, guestName = '', returnRoomId = null) => {
    setPreJoinChoices(choices);
    setIsJoining(true);
    if (returnRoomId) setMainRoomId(returnRoomId);
    
    try {
      const res = await apiClient.post('/meeting-livekit/token', { 
        room_id: roomId, 
        guest_name: guestName 
      });

      const data = res.data;
      setLivekitToken(data.token);
      
      // Enhanced LiveKit URL patching for cross-network support
      let serverUrl = data.url || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.hostname + ':7880';
      
      if (typeof window !== 'undefined') {
         const currentHost = window.location.hostname;
         const isPageSecure = window.location.protocol === 'https:';
         
         // Ensure protocol compatibility
         if (isPageSecure && serverUrl.startsWith('ws:')) {
            serverUrl = serverUrl.replace('ws:', 'wss:');
         }

         // Patch host part if it's a generic listen address or looks like an internal LAN IP
         // We only patch if the URL doesn't already point to the current host
         const patchNeeded = serverUrl.includes('0.0.0.0') || 
                            serverUrl.includes('127.0.0.1') || 
                            /192\.168\.\d+\.\d+/.test(serverUrl);
                            
         if (patchNeeded) {
            // Check if currentHost is actually different from the URL's hostname
            const currentUrlHost = serverUrl.replace(/^(ws|wss):\/\//, '').split(/[:\/]/)[0];
            if (currentUrlHost !== currentHost) {
               serverUrl = serverUrl.replace(/^(ws|wss):\/\/[^\/:]+/, `$1://${currentHost}`);
               console.log(`[Meeting] 🛡️ Network-optimized LiveKit URL: ${serverUrl} (from ${currentUrlHost})`);
            }
         }
      }
      
      console.log(`[Meeting] 🚀 Joining with URL: ${serverUrl}`);
      setLivekitUrl(serverUrl);
      setShouldJoin(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleSwitchRoom = async (newRoomId, currentMainRoomId = null) => {
    // 1. Reset state
    setShouldJoin(false);
    setLivekitToken(null);
    setIsJoining(true);
    
    if (newRoomId) {
      if (currentMainRoomId) setMainRoomId(currentMainRoomId);
      navigate(`/meeting/${newRoomId}`);
      
      try {
        const res = await apiClient.post('/meeting-livekit/token', { 
          room_id: newRoomId, 
          guest_name: user?.full_name || user?.username || 'Participant' 
        });
        setLivekitToken(res.data.token);
        setShouldJoin(true);
      } catch (err) {
        console.error("Auto-switch failed", err);
        setError("Failed to transition session.");
      } finally {
        setIsJoining(false);
      }
    } else {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (roomInfo && roomInfo.breakout_status === 'active' && !roomInfo.is_breakout && !isJoining) {
       try {
         const config = typeof roomInfo.breakout_config === 'string' ? JSON.parse(roomInfo.breakout_config) : (roomInfo.breakout_config || {});
         const identityMatch = user?.id?.toString() || user?.username;
         const targetId = config.assignments?.[identityMatch];
         if (targetId && targetId.toString() !== roomId?.toString()) {
            handleSwitchRoom(targetId.toString(), roomId.toString());
         }
       } catch(e) {}
    }
  }, [roomInfo, user, roomId, isJoining]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen overflow-hidden relative" style={{ background: 'var(--vb-bg-root)', color: 'var(--vb-text-primary)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent z-0"></div>
        <div className="backdrop-blur-3xl p-10 rounded-[2.5rem] shadow-2xl border border-red-500/20 max-w-md text-center z-10" style={{ background: 'var(--vb-bg-card)' }}>
          <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/10">
            <FaShieldAlt className="text-3xl text-red-500 animate-pulse" />
          </div>
          <h3 className="text-2xl text-white mb-3 font-black tracking-tight">Connectivity Interrupted</h3>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl hover:from-red-500 hover:to-red-600 text-white transition-all shadow-xl font-bold flex items-center justify-center gap-2 group"
            >
              <FaSpinner className="group-hover:rotate-180 transition-transform duration-700" />
              Reconnect to Server
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all text-sm font-semibold"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="flex flex-col items-center justify-center h-screen relative overflow-hidden" style={{ background: 'var(--vb-bg-root)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent z-0"></div>
        <div className="z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <p className="text-lg font-semibold" style={{ color: 'var(--vb-text-primary)' }}>Connecting to meeting...</p>
          <p className="text-sm mt-2" style={{ color: 'var(--vb-text-secondary)' }}>Setting up your audio and video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: 'var(--vb-bg-root)' }}>
      {!shouldJoin ? (
        <PremiumPreJoinScreen
          onJoin={(choices, guestName) => handleJoinMeeting(choices, guestName)}
          username={user?.full_name || user?.username || 'Guest'}
          roomId={roomId}
          roomInfo={roomInfo}
        />
      ) : (
        <LiveKitRoom
          video={preJoinChoices.videoEnabled}
          audio={preJoinChoices.audioEnabled}
          token={livekitToken}
          serverUrl={livekitUrl}
          data-lk-theme={document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'}
          connectOptions={{
            autoSubscribe: true,
            adaptiveStream: true,
            dynacast: true,
          }}
          onConnected={() => console.log('[Meeting] ✅ Successfully connected to LiveKit')}
          onDisconnected={() => {
            console.warn('[Meeting] 🔌 Disconnected from LiveKit');
            setShouldJoin(false);
          }}
          onError={(err) => {
            console.error('[Meeting] ❌ LiveKit Error:', err);
            setError(`Connection Error: ${err.message || 'Failed to establish connection'}`);
          }}
          style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
        >
          <LayoutContextProvider>
            <PremiumRoomInner 
              roomId={roomId} 
              roomInfo={roomInfo} 
              onLeave={() => navigate('/dashboard')} 
              preJoinChoices={preJoinChoices}
              onSwitchRoom={handleSwitchRoom}
            />
          </LayoutContextProvider>
        </LiveKitRoom>
      )}
    </div>
  );
}

// ============= PREMIUM ROOM INNER =============
function PremiumRoomInner({ roomId, roomInfo, onLeave, preJoinChoices, onSwitchRoom }) {
  const [sidebarView, setSidebarView] = useState('chat');
  const [recordingActive, setRecordingActive] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [handRaised, setHandRaised] = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);
  const [raisedHands, setRaisedHands] = useState({}); // { [participantIdentity]: true }
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [muted, setMuted] = useState(!preJoinChoices?.audioEnabled);
  const [videoOff, setVideoOff] = useState(!preJoinChoices?.videoEnabled);
  const { user } = useAuthStore();
  
  // Use loose equality or cast to ensure numeric vs string IDs match
  const isInitiator = user && roomInfo && (String(user.id) === String(roomInfo.host_id) || user.role === 'super_admin');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [isLocked, setIsLocked] = useState(roomInfo?.is_locked || false);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  
  const [pendingParticipants, setPendingParticipants] = useState(new Set());
  const [approvedParticipants, setApprovedParticipants] = useState(new Set());
  const [speakingParticipant, setSpeakingParticipant] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('Excellent');
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  
  const room = useRoomContext();
  const LK_Participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Sync initial state with tracks
  useEffect(() => {
    if (localParticipant && room?.state === ConnectionState.Connected) {
      localParticipant.setCameraEnabled(!videoOff).catch(console.error);
      localParticipant.setMicrophoneEnabled(!muted).catch(console.error);
    }
  }, [room?.state, localParticipant]);

  // Track state changes to local controls
  const handleMuteToggle = async () => {
    const next = !muted;
    setMuted(next);
    if (localParticipant) await localParticipant.setMicrophoneEnabled(!next);
  };

  const handleVideoToggle = async () => {
    const next = !videoOff;
    setVideoOff(next);
    if (localParticipant) await localParticipant.setCameraEnabled(!next);
  };

  const handleScreenShare = async () => {
    if (!allowScreenShare && !isInitiator) return;
    const next = !screenSharing;
    setScreenSharing(next);
    if (localParticipant) {
      await localParticipant.setScreenShareEnabled(next, {
        audio: true,
        videoCaptureDefaults: {
          resolution: { width: 1920, height: 1080 },
          frameRate: 30
        }
      });
    }
  };

  const handleToggleLock = async () => {
    if (!isInitiator) return;
    try {
      const next = !isLocked;
      await apiClient.post(`/rooms/${roomId}/lock`, { is_locked: next });
      setIsLocked(next);
      broadcastData({ type: 'ROOM_LOCK_UPDATE', isLocked: next });
    } catch (e) { console.error(e); }
  };

  const handleKickParticipant = async (participantId, userId) => {
    if (!isInitiator) return;
    try {
      await apiClient.post(`/rooms/${roomId}/kick`, { user_id: userId || participantId });
      broadcastData({ type: 'KICK_USER', target: participantId });
    } catch (e) { console.error(e); }
  };

  const handleToggleScreenShareRestriction = () => {
    if (!isInitiator) return;
    const next = !allowScreenShare;
    setAllowScreenShare(next);
    broadcastData({ type: 'SCREEN_SHARE_RESTRICTION', allowed: next });
  };

  const broadcastData = (payload) => {
    if (!localParticipant) return;
    const data = JSON.stringify(payload);
    localParticipant.publishData(new TextEncoder().encode(data), { reliable: true });
  };

  // Global Handlers
  const handleMuteAll = () => broadcastData({ type: 'MUTE_ALL' });
  const handleEndMeeting = async () => {
    broadcastData({ type: 'END_MEETING' });
    setTimeout(() => {
       if (isInitiator) roomsAPI.deleteRoom(roomId).catch(() => {});
       onLeave();
    }, 500);
  };

  // Data Listeners
  useEffect(() => {
    if (!room) return;
    const onData = (payload, participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'MUTE_ALL' && !isInitiator) {
           setMuted(true);
           localParticipant?.setMicrophoneEnabled(false);
        }
        if (data.type === 'END_MEETING' && !isInitiator) onLeave();
        if (data.type === 'KICK_USER' && data.target === localParticipant?.identity) onLeave();
        if (data.type === 'ROOM_LOCK_UPDATE') setIsLocked(data.isLocked);
        if (data.type === 'SCREEN_SHARE_RESTRICTION') {
           setAllowScreenShare(data.allowed);
           if (!data.allowed && screenSharing) {
              setScreenSharing(false);
              localParticipant?.setScreenShareEnabled(false);
           }
        }
        if (data.type === 'BREAKOUT_START' && !isInitiator && data.assignments) {
           const target = data.assignments[localParticipant?.identity];
           if (target) onSwitchRoom(target, roomId);
        }
        if (data.type === 'BREAKOUT_STOP' && !isInitiator && roomInfo?.is_breakout) {
           if (roomInfo.parent_id) onSwitchRoom(roomInfo.parent_id);
        }
        if (data.type === 'HAND_RAISE') {
           setRaisedHands(prev => ({ ...prev, [data.identity]: data.active }));
           console.log(`[Meeting] Participant ${data.identity} ${data.active ? 'raised' : 'lowered'} hand`);
        }
      } catch (e) {}
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => room.off(RoomEvent.DataReceived, onData);
  }, [room, localParticipant, isInitiator, screenSharing, onLeave, onSwitchRoom, roomId, roomInfo?.is_breakout, roomInfo?.parent_id]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // React to events from chat (Reactions)
  const { chatMessages, send: sendChatMessage } = useChat();
  useEffect(() => {
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && ['👍', '🚀', '❤️', '😂', '🔥', '👏', '🎉', '🙌', '😯', '😊'].includes(lastMsg.message)) {
      const id = Date.now() + Math.random();
      setActiveReactions(prev => [...prev, { id, emoji: lastMsg.message, from: lastMsg.from?.identity || 'Anonymous' }]);
      setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 4000);
    }
  }, [chatMessages]);

  // Track speaking participants
  useEffect(() => {
    const speakingParts = LK_Participants.filter(p => p.isSpeaking);
    if (speakingParts.length > 0) {
      setSpeakingParticipant(speakingParts[speakingParts.length - 1].identity);
    } else {
      // Small timeout before clearing speaker to prevent flickering
      const timer = setTimeout(() => {
          if (LK_Participants.filter(p => p.isSpeaking).length === 0) {
              setSpeakingParticipant(null);
          }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [LK_Participants]);

  const toggleRaiseHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    setRaisedHands(prev => ({ ...prev, [localParticipant?.identity]: next }));
    broadcastData({ type: 'HAND_RAISE', active: next, identity: localParticipant?.identity });
  };

  // Device settings (camera/audio) - placeholder for now, actual implementation would involve LiveKit device management
  const [cameraDevices, setCameraDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [videoFilter, setVideoFilter] = useState('none');

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        const mics = devices.filter(d => d.kind === 'audioinput');
        setCameraDevices(cameras);
        setAudioDevices(mics);
        if (cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(cameras[0].deviceId);
        }
        if (mics.length > 0 && !selectedAudio) {
          setSelectedAudio(mics[0].deviceId);
        }
      } catch (e) {
        console.error("Error enumerating devices:", e);
      }
    };
    loadDevices();
  }, [selectedCamera, selectedAudio]);


  const getGridLayout = () => {
    const count = tracks.length;
    if (count === 0) return { mode: 'grid', gridSize: 'grid-cols-1' };
    const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
    let focusId = speakingParticipant;
    if (screenShareTrack) {
        return { mode: 'presenter', focusIdentity: screenShareTrack.participant.identity, isScreenShare: true, gridCols: count - 1 <= 1 ? 'grid-cols-1' : count - 1 <= 4 ? 'grid-cols-2' : 'grid-cols-3' };
    }
    if (focusId && count > 1) {
        return { mode: 'presenter', focusIdentity: focusId, isScreenShare: false, gridCols: count - 1 <= 1 ? 'grid-cols-1' : count - 1 <= 4 ? 'grid-cols-2' : 'grid-cols-3' };
    }
    const cols = count === 1 ? 'grid-cols-1' : count <= 2 ? 'grid-cols-1 sm:grid-cols-2' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3';
    return { mode: 'grid', gridSize: cols };
  };

  const layout = getGridLayout();

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-700 ${isCinematic ? 'scale-[0.98] rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)]' : ''}`} style={{ background: 'var(--vb-bg-root)', color: 'var(--vb-text-primary)' }}>
      <PremiumMeetingHeader 
        roomId={roomId} 
        roomInfo={roomInfo} 
        recordingActive={recordingActive} 
        handsRaised={new Set()} 
        isInitiator={isInitiator} 
        onReturn={() => onSwitchRoom(roomInfo?.parent_id)}
      />

      {/* No button here to avoid icon mismatch */}

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 p-4 relative overflow-hidden">
             <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                {activeReactions.map(r => (
                  <div key={r.id} className="absolute bottom-[-50px] animate-floatUp" style={{ left: `${r.x || 50}%` }}>
                    <span className="text-4xl drop-shadow-2xl">{r.emoji}</span>
                  </div>
                ))}
             </div>

             {showWhiteboard ? (
               <div className="w-full h-full bg-slate-900/60 rounded-[3rem] border border-white/10 overflow-hidden animate-zoomIn">
                 <Whiteboard roomId={roomId} onExit={() => setShowWhiteboard(false)} />
               </div>
             ) : (
                 <div className="w-full h-full animate-fadeIn">
                  <VideoConference 
                    className="premium-lk-grid h-full"
                    participantRenderer={(p) => (
                      <div className="w-full h-full p-2 relative group overflow-hidden rounded-[2.5rem]">
                        <ParticipantTile participant={p} className="lk-tile-custom" />
                        
                        {/* Hand raised indicator overlay */}
                        {raisedHands[p.identity] && (
                          <div className="absolute top-6 right-6 z-40 animate-modalPop">
                            <div className="w-12 h-12 rounded-[1.25rem] bg-amber-500 shadow-[0_10px_30px_rgba(245,158,11,0.5)] flex items-center justify-center border border-white/30 backdrop-blur-xl">
                              <FaHandPaper className="text-white text-xl animate-pulse" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
                           <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                              <span className="text-[10px] font-black uppercase text-white/90">{p.name || p.identity}</span>
                           </div>
                           <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!p.isMicrophoneEnabled && <div className="w-8 h-8 rounded-xl bg-red-500/80 flex items-center justify-center"><FaMicrophoneSlash size={10} /></div>}
                           </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
             )}
          </div>
          
          <AdvancedControlBar 
            onLeave={onLeave}
            sidebarView={sidebarView}
            onToggleSidebar={(v) => setSidebarView(sidebarView === v ? null : v)}
            recordingActive={recordingActive}
            onRecordingToggle={() => setRecordingActive(!recordingActive)}
            handRaised={handRaised}
            onHandRaise={toggleRaiseHand}
            muted={muted}
            onMuteToggle={handleMuteToggle}
            videoOff={videoOff}
            onVideoToggle={handleVideoToggle}
            onSettings={() => setShowSettings(!showSettings)}
            onMoreToggle={() => setShowMoreMenu(!showMoreMenu)}
            showMoreMenu={showMoreMenu}
            screenSharing={screenSharing}
            onScreenShare={handleScreenShare}
            isInitiator={isInitiator}
            noiseSuppression={noiseSuppression}
            onNoiseSuppressionToggle={() => setNoiseSuppression(!noiseSuppression)}
            cameraDevices={cameraDevices}
            selectedCamera={selectedCamera}
            onCameraChange={setSelectedCamera}
            showWhiteboard={showWhiteboard}
            onWhiteboardToggle={() => setShowWhiteboard(!showWhiteboard)}
            isCinematic={isCinematic}
            onCinematicToggle={() => setIsCinematic(!isCinematic)}
            layoutMode={layoutMode}
            onLayoutChange={(l) => setLayoutMode(l)}
            onMuteAll={handleMuteAll}
            onEndMeeting={handleEndMeeting}
            onStatsToggle={() => setShowConnectionPanel(!showConnectionPanel)}
          />
        </div>

        <PremiumSidebar 
          roomId={roomId}
          view={sidebarView}
          onClose={() => setSidebarView(null)}
          onViewChange={setSidebarView}
          isInitiator={isInitiator}
          isLocked={isLocked}
          onToggleLock={handleToggleLock}
          onKickParticipant={handleKickParticipant}
          allowScreenShare={allowScreenShare}
          onToggleScreenShare={handleToggleScreenShareRestriction}
          participants={LK_Participants}
          onBroadcast={broadcastData}
          pendingParticipants={pendingParticipants}
          approvedParticipants={approvedParticipants}
          onApproveParticipant={(id) => {
            setPendingParticipants(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            setApprovedParticipants(prev => new Set(prev).add(id));
          }}
          onRejectParticipant={(id) => {
            setPendingParticipants(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }}
        />
        <style>{`
          [data-theme='light'] {
             --mt-bg-root: #f8fafc;
             --mt-bg-card: rgba(255, 255, 255, 0.7);
             --mt-bg-sidebar: rgba(255, 255, 255, 0.9);
             --mt-text-primary: #0f172a;
             --mt-text-secondary: #64748b;
             --mt-border: rgba(0, 0, 0, 0.06);
             --mt-header-grad: linear-gradient(to right, #ffffff, #f1f5f9);
          }

          [data-theme='dark'] {
             --mt-bg-root: #020617;
             --mt-bg-card: rgba(30, 41, 59, 0.4);
             --mt-bg-sidebar: rgba(15, 23, 42, 0.9);
             --mt-text-primary: #f8fafc;
             --mt-text-secondary: #94a3b8;
             --mt-border: rgba(255, 255, 255, 0.08);
             --mt-header-grad: linear-gradient(to right, #0f172a, #020617);
          }
        `}</style>
        <MeetingStyles />
      </div>

      {/* Connection Stats Panel */}
      {showConnectionPanel && (
        <NetworkIntelligencePanel 
          onClose={() => setShowConnectionPanel(false)} 
          quality={connectionQuality}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <DeviceSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          cameraDevices={cameraDevices}
          audioDevices={audioDevices}
          selectedCamera={selectedCamera}
          selectedAudio={selectedAudio}
          onCameraChange={setSelectedCamera}
          onAudioChange={setSelectedAudio}
          videoFilter={videoFilter}
          onFilterChange={setVideoFilter}
          isInitiator={isInitiator}
          noiseSuppression={noiseSuppression}
          onNoiseSuppressionToggle={() => setNoiseSuppression(!noiseSuppression)}
        />
      )}

      <RoomAudioRenderer />
    </div>
  );
}


// ============= PREMIUM COMPONENTS =============

function PremiumMeetingHeader({ roomId, roomInfo = {}, recordingActive, handsRaised = new Set(), isInitiator, onReturn }) {
  const [elapsed, setElapsed] = useState(0);
  const participants = useParticipants();

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return hours > 0 
      ? `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-20 border-b backdrop-blur-2xl flex items-center justify-between px-8 shrink-0 shadow-2xl" style={{ background: 'var(--mt-header-grad)', borderColor: 'var(--mt-border)' }}>
      {/* Left - Title & Status */}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-xl truncate max-w-xs" style={{ color: 'var(--mt-text-primary)' }}>{(roomInfo && (roomInfo.name || roomInfo.title)) || 'Live Meeting'}</h2>
        <div className="px-3 py-1.5 rounded-lg text-xs border cursor-pointer transition-all" style={{ background: 'var(--vb-hover-bg)', color: 'var(--mt-text-secondary)', borderColor: 'var(--mt-border)' }}>
          {roomId?.substring(0, 8)}...
        </div>
        {isInitiator && (
          <div className="px-3 py-1.5 bg-purple-900/50 rounded-lg text-xs text-purple-300 border border-purple-600/30 flex items-center gap-1.5">
            <FaShieldAlt className="text-sm" />
            <span>Host</span>
          </div>
        )}
        {roomInfo?.is_breakout && (
          <button 
            onClick={onReturn}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] text-white font-black border border-white/20 flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
          >
            <FaSignOutAlt className="rotate-180" />
            RETURN TO MAIN
          </button>
        )}
      </div>

      {/* Center - Time & Network */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-300">
          <FaRegClock className="text-blue-400" />
          <span className="tabular-nums font-semibold">{formatTime(elapsed)}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <div className="flex gap-1">
            <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-green-500/50 rounded-sm"></div>
          </div>
          <span className="text-xs font-semibold">HD</span>
        </div>

        <div className="text-slate-300 flex items-center gap-2">
          <span className="text-sm font-semibold">{participants.length} Participants</span>
        </div>

        {handsRaised.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 rounded-lg border border-amber-500/30 animate-pulse">
            <span className="text-xl">✋</span>
            <span className="text-xs font-semibold text-amber-300">{handsRaised.size} hand(s) raised</span>
          </div>
        )}
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/20">
          <IoNotifications className="text-lg" />
        </button>
        <button className="w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/20">
          <FaEllipsisH className="text-lg" />
        </button>
      </div>
    </div>
  );
}

function PremiumSidebar({ 
  roomId,
  view, 
  onClose, 
  onViewChange, 
  handsRaised = new Set(), 
  isInitiator, 
  isLocked,
  onToggleLock,
  onKickParticipant,
  allowScreenShare,
  onToggleScreenShare,
  participants = [],
  onBroadcast,
  pendingParticipants = new Set(), 
  approvedParticipants = new Set(), 
  onApproveParticipant, 
  onRejectParticipant 
}) {
  if (!view) return null;

  const tabs = [
    { id: 'chat', label: 'Comms', icon: <FaCommentAlt /> },
    { id: 'participants', label: 'Crew', icon: <FaUsers /> },
    { id: 'ai', label: 'AI Core', icon: <FaBrain /> }
  ];

  if (isInitiator) {
    tabs.splice(2, 0, { id: 'breakout', label: 'Breakout', icon: <IoSwapHorizontal /> });
  }

  return (
    <div className={`absolute md:relative right-0 z-50 w-full md:w-96 border-l backdrop-blur-2xl flex flex-col h-full shadow-2xl transition-all`} style={{ background: 'var(--mt-bg-sidebar)', borderColor: 'var(--mt-border)' }}>
      {/* Header with Tab Selection */}
      <div className="flex flex-col border-b px-4 pt-6 pb-4" style={{ borderColor: 'var(--mt-border)', background: 'transparent' }}>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-2" style={{ color: 'var(--mt-text-secondary)' }}>Operational Interface</h3>
        <div className="flex gap-1.5 p-1 rounded-2xl border" style={{ background: 'var(--vb-hover-bg)', borderColor: 'var(--mt-border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                view === tab.id
                  ? 'bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] border border-indigo-400/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              <span className="hidden lg:inline">{tab.label}</span>
              {tab.id === 'participants' && pendingParticipants.size > 0 && (
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_currentColor] animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'chat' && <PremiumChatView />}
        {view === 'participants' && (
          <PremiumParticipantsView 
            handsRaised={handsRaised} 
            isInitiator={isInitiator}
            isLocked={isLocked}
            onToggleLock={onToggleLock}
            onKickParticipant={onKickParticipant}
            allowScreenShare={allowScreenShare}
            onToggleScreenShare={onToggleScreenShare}
            onBroadcast={onBroadcast}
            pendingParticipants={pendingParticipants}
            approvedParticipants={approvedParticipants}
            onApproveParticipant={onApproveParticipant}
            onRejectParticipant={onRejectParticipant}
          />
        )}
        {view === 'breakout' && isInitiator && (
          <BreakoutRoomManager 
            roomId={roomId} 
            participants={participants} 
            onClose={onClose} 
            onBroadcast={onBroadcast}
          />
        )}
        {view === 'reactions' && <PremiumReactionsView />}
        {view === 'ai' && <MeetingAIFeaturesView roomId={roomId || ''} />}
      </div>
    </div>
  );
}

function PremiumChatView() {
  const { send, chatMessages } = useChat();
  const [message, setMessage] = useState('');
  const [view, setView] = useState('public'); // 'public' or 'direct'
  const [selectedUser, setSelectedUser] = useState(null);
  const [dmMessages, setDmMessages] = useState({});
  const [showMentions, setShowMentions] = useState(false);
  const [mentionInput, setMentionInput] = useState('');
  const participants = useParticipants();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, dmMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      if (view === 'public' && send) {
        // Process mentions in message
        const processedMessage = message.replace(/@(\w+)/g, (match, name) => {
          const mentioned = participants.find(p => 
            p.identity?.toLowerCase().includes(name.toLowerCase()) || 
            p.name?.toLowerCase().includes(name.toLowerCase())
          );
          return mentioned ? `@${mentioned.identity}` : match;
        });
        send(processedMessage);
      } else if (view === 'direct' && selectedUser) {
        // Store direct message locally (in production, send to backend)
        const key = `${selectedUser.identity}-direct`;
        setDmMessages(prev => ({
          ...prev,
          [key]: [...(prev[key] || []), {
            timestamp: Date.now(),
            from: 'You',
            message: message,
            isOwn: true
          }]
        }));
      }
      setMessage('');
      setShowMentions(false);
    }
  };

  const handleMessageChange = (value) => {
    setMessage(value);
    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionInput(afterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const filteredParticipants = mentionInput
    ? participants.filter(p => 
        (p.identity || '').toLowerCase().includes(mentionInput.toLowerCase()) ||
        (p.name || '').toLowerCase().includes(mentionInput.toLowerCase())
      )
    : participants;

  const getDisplayMessages = () => {
    if (view === 'public') {
      return chatMessages;
    } else if (view === 'direct' && selectedUser) {
      const key = `${selectedUser.identity}-direct`;
      return dmMessages[key] || [];
    }
    return [];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Type Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-slate-800/20">
        <button
          onClick={() => { setView('public'); setSelectedUser(null); }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            view === 'public'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Group Chat
        </button>
        <button
          onClick={() => setView('direct')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            view === 'direct'
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Direct
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {view === 'public' ? (
          <>
            {chatMessages.length === 0 && (
              <div className="text-center text-slate-500 mt-12 text-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-blue-500/20">
                  💬
                </div>
                <p className="font-semibold text-slate-300">No messages yet</p>
                <p className="text-xs text-slate-500">Start the conversation!</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => {
              const fromName = typeof msg.from === 'string' ? msg.from : (msg.from?.name || msg.from?.identity || 'Unknown');
              return (
                <div key={idx} className="flex gap-3 animate-slideInUp group">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                    {fromName.substring(0, 1).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1.5 px-1">
                      <span className="font-black text-indigo-300 text-[10px] uppercase tracking-wider">{fromName}</span>
                      <span className="text-[9px] text-slate-600 font-bold">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 rounded-2xl rounded-tl-none p-3 text-slate-100 break-words border border-white/5 hover:border-indigo-500/30 transition-all text-xs leading-relaxed shadow-sm">
                      {(msg.message || msg.text || '').split(/(@\w+)/g).map((part, i) =>
                        part.startsWith('@') ? (
                          <span key={i} className="text-blue-400 font-semibold">{part}</span>
                        ) : (
                          part
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : view === 'direct' && selectedUser ? (
          <>
            {(dmMessages[`${selectedUser.identity}-direct`] || []).length === 0 && (
              <div className="text-center text-slate-500 mt-8 text-sm">
                <p className="font-semibold text-slate-300">No messages yet</p>
                <p className="text-xs text-slate-500">Start a conversation with {selectedUser.identity}</p>
              </div>
            )}
            {(dmMessages[`${selectedUser.identity}-direct`] || []).map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                  msg.isOwn 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}>
                  {(msg.from || 'U').substring(0, 1).toUpperCase()}
                </div>
                <div className={`flex-1 min-w-0 flex ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`max-w-xs bg-slate-800/70 rounded-xl p-2.5 text-slate-100 break-words border border-white/10 text-xs leading-relaxed ${
                    msg.isOwn ? 'bg-blue-600/70 text-blue-50' : 'bg-slate-800/70 text-slate-100'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : view === 'direct' && !selectedUser ? (
          <div className="text-center text-slate-500 mt-8 text-sm">
            <p className="font-semibold text-slate-300">Select a participant</p>
            <p className="text-xs text-slate-500">Choose someone to message</p>
          </div>
        ) : null}
        <div ref={chatEndRef} />
      </div>

      {/* Direct Message Participant Selection */}
      {view === 'direct' && !selectedUser && (
        <div className="p-3 border-t border-white/5 bg-slate-800/20 max-h-40 overflow-y-auto">
          <p className="text-xs text-slate-400 font-semibold mb-2">Participants</p>
          <div className="space-y-1.5">
            {participants.map(p => (
              <button
                key={p.identity}
                onClick={() => setSelectedUser(p)}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-slate-800/50 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {p.identity?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="text-xs text-slate-300 truncate">{p.identity}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-white/10 bg-gradient-to-t from-slate-950 to-transparent">
        {view === 'direct' && selectedUser && (
          <button
            onClick={() => { setSelectedUser(null); setMessage(''); }}
            className="text-xs text-slate-400 hover:text-slate-300 mb-2 block"
          >
            ← Back to participants
          </button>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder={view === 'direct' && selectedUser ? `Message ${selectedUser.identity}...` : 'Write a message... (use @name to mention)'}
            className="flex-1 bg-slate-800/60 text-white rounded-lg px-3 py-2 text-xs border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 placeholder-slate-600 transition-all"
          />
          <button
            type="submit"
            className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg flex items-center justify-center transition-all shadow-lg hover:shadow-blue-600/30"
          >
            <FaPaperPlane className="text-xs" />
          </button>
        </form>

        {/* Mention Autocomplete */}
        {showMentions && filteredParticipants.length > 0 && view === 'public' && (
          <div className="mt-2 bg-slate-800/80 rounded-lg border border-white/10 overflow-hidden max-h-24 overflow-y-auto">
            {filteredParticipants.slice(0, 4).map(p => (
              <button
                key={p.identity}
                onClick={() => {
                  const newMsg = message.substring(0, message.lastIndexOf('@')) + `@${p.name || p.identity} `;
                  setMessage(newMsg);
                  setShowMentions(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-all flex items-center gap-2 text-xs"
              >
                <span className="text-blue-400">@{p.name || p.identity}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji Quick Access */}
        <div className="flex gap-1.5 mt-2 justify-center">
          {['😊', '👍', '❤️', '🔥', '😯'].map((emoji, i) => (
            <button
              key={i}
              onClick={() => {
                setMessage(prev => prev + emoji);
              }}
              className="text-sm hover:scale-125 hover:bg-slate-700/50 p-1 rounded transition-all"
              title={['smile', 'thumbsup', 'heart', 'fire', 'shocked'][i]}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PremiumReactionsView() {
  const { chatMessages, send } = useChat();
  const [reactions, setReactions] = useState({});

  const handleReaction = (emoji) => {
    setReactions(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1
    }));
    // Also send via chat
    if (send) {
      send(emoji);
    }
  };

  // Group reactions from messages
  const emojiReactions = ['👍', '🚀', '❤️', '😂', '🔥', '👏', '🎉', '🙌'];
  
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 overflow-y-auto space-y-2">
        {emojiReactions.map((emoji) => {
          const count = reactions[emoji] || 0;
          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="w-full bg-slate-800/50 rounded-lg p-3 border border-white/10 hover:border-white/20 hover:bg-slate-800/70 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emoji}</span>
                {count > 0 && (
                  <span className="text-sm font-semibold text-slate-300">{count}</span>
                )}
              </div>
              <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-all">Click to react</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-white/10">
        <p className="text-xs text-slate-400 font-semibold mb-2">Quick Reactions</p>
        <div className="flex gap-2 flex-wrap">
          {['👍', '❤️', '🔥', '😂'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-xl hover:scale-125 hover:bg-slate-700/50 p-1 rounded transition-all"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PremiumParticipantsView({ 
  handsRaised = new Set(), 
  isInitiator, 
  isLocked,
  onToggleLock,
  onKickParticipant,
  allowScreenShare,
  onToggleScreenShare,
  onBroadcast,
  pendingParticipants = new Set(), 
  approvedParticipants = new Set(), 
  onApproveParticipant, 
  onRejectParticipant 
}) {
  const participants = useParticipants();

  return (
    <div className="flex flex-col h-full p-6 animate-fadeIn">
      {/* Administrative Controls */}
      {isInitiator && (
        <div className="mb-8 space-y-4">
          <div className="p-5 bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] shadow-xl">
             <div className="flex items-center justify-between mb-4">
               <div>
                  <h5 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Meeting Security</h5>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Host Sovereignty Mode</p>
               </div>
               <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-3">
                    <span className="text-[8px] text-slate-400 font-black uppercase">Lock Room</span>
                    <button 
                      onClick={onToggleLock}
                      className={`w-10 h-5 rounded-full relative transition-all duration-500 ${isLocked ? 'bg-red-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-500 ${isLocked ? 'left-5.5 shadow-[0_0_10px_white]' : 'left-0.5'}`}></div>
                    </button>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-[8px] text-slate-400 font-black uppercase">Allow Share</span>
                    <button 
                      onClick={onToggleScreenShare}
                      className={`w-10 h-5 rounded-full relative transition-all duration-500 ${allowScreenShare ? 'bg-green-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-500 ${allowScreenShare ? 'left-5.5' : 'left-0.5'}`}></div>
                    </button>
                 </div>
               </div>
             </div>
             
             <div className="flex gap-2">
                <button 
                  onClick={() => onBroadcast({ type: 'MUTE_ALL' })}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-[9.5px] font-black uppercase tracking-widest text-slate-300 hover:text-white"
                >
                  Mute All Nodes
                </button>
             </div>
          </div>
          
          {pendingParticipants.size > 0 && (
            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_currentColor]"></div>
                <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Entry Requests ({pendingParticipants.size})</p>
              </div>
              <div className="space-y-2">
                {Array.from(pendingParticipants).map(id => (
                  <div key={id} className="flex items-center justify-between gap-3 p-3 bg-black/40 rounded-2xl border border-white/5 group">
                    <span className="text-xs text-white font-bold truncate">{id}</span>
                    <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onApproveParticipant(id)}
                        className="w-8 h-8 bg-green-500/20 hover:bg-green-500 text-green-400 rounded-lg flex items-center justify-center transition-all"
                      >
                        <FaCheck size={12} />
                      </button>
                      <button
                        onClick={() => onRejectParticipant(id)}
                        className="w-8 h-8 bg-red-500/20 hover:bg-red-500 text-red-400 rounded-lg flex items-center justify-center transition-all"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero Stats */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h4 className="text-white font-black text-lg tracking-tighter">{participants.length} Active Nodes</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Live Encryption Active</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 border border-white/5">
          <FaUsers size={20} />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {participants.map((p) => {
          const hasRaisedHand = handsRaised.has(p.identity);
          const isMe = p.identity === 'me' || p.isLocal;
          return (
            <div
              key={p.identity}
              className={`p-4 rounded-[1.5rem] border transition-all duration-500 group relative overflow-hidden ${
                p.isSpeaking
                  ? 'bg-indigo-600/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                  : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30'
              }`}
            >
              {p.isSpeaking && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
              )}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black transition-all duration-500 ${
                    p.isSpeaking 
                      ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-110' 
                      : 'bg-slate-800 border border-white/10'
                  }`}>
                    {(p.name || p.identity || '?').charAt(0).toUpperCase()}
                  </div>
                </div>
 
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm truncate uppercase tracking-tight">{p.name || p.identity}</span>
                    {hasRaisedHand && (
                      <span className="px-2 py-0.5 bg-amber-500 text-black text-[8px] font-black rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-bounce">HAND RAISED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                    <div className={`flex items-center gap-1 text-[9px] font-bold ${p.isCameraEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                      {p.isCameraEnabled ? <FaVideo size={10} /> : <FaVideoSlash size={10} />}
                      {p.isCameraEnabled ? 'HD OPTIC' : 'LOCKED'}
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] font-bold ${p.isMicrophoneEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                      {p.isMicrophoneEnabled ? <FaMicrophone size={10} /> : <FaMicrophoneSlash size={10} />}
                      {p.isMicrophoneEnabled ? 'AUDIO LIVE' : 'MUTED'}
                    </div>
                  </div>
                </div>
 
                <div className="flex items-center gap-2">
                  {hasRaisedHand && <div className="text-xl animate-pulse mr-2">✋</div>}
                  {isInitiator && !isMe && (
                    <button
                      onClick={() => onKickParticipant(p.identity, p.userId || p.identity)}
                      className="opacity-0 group-hover:opacity-100 transition-all w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center border border-red-500/20"
                      title="Expel Node"
                    >
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdvancedControlBar({ 
  onLeave, 
  sidebarView, 
  onToggleSidebar,
  recordingActive,
  onRecordingToggle,
  handRaised,
  onHandRaise,
  muted,
  onMuteToggle,
  videoOff,
  onVideoToggle,
  onSettings,
  onMoreToggle,
  showMoreMenu,
  screenSharing,
  onScreenShare,
  isInitiator,
  noiseSuppression,
  onNoiseSuppressionToggle,
  cameraDevices,
  selectedCamera,
  onCameraChange,
  showWhiteboard,
  onWhiteboardToggle,
  isCinematic,
  onCinematicToggle,
  layoutMode,
  onLayoutChange,
  onMuteAll,
  onEndMeeting,
  onStatsToggle
}) {
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onMoreToggle && onMoreToggle();
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu, onMoreToggle]);

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // Could add a local toast here, but simple alert or visual feedback works.
    const btn = document.getElementById('copy-link-btn');
    if (btn) {
      btn.innerHTML = '✅ Copied!';
      setTimeout(() => btn.innerHTML = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v336c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM352 32h14.118L416 81.882V96h-64V32zM176 384V48h128v64c0 17.67 14.33 32 32 32h64v240H176zM112 160h-16c-17.67 0-32 14.33-32 32v272c0 17.67 14.33 32 32 32h224c17.67 0 32-14.33 32-32v-16h48v16c0 44.18-35.82 80-80 80H96c-44.18 0-80-35.82-80-80V192c0-44.18 35.82-80 80-80h16v48z"></path></svg>', 2000);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-auto max-w-[95vw]">
      <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-4 py-3 flex items-center gap-2 sm:gap-4 shadow-[0_32px_100px_rgba(0,0,0,0.6)] animate-slideUp">
        
        {/* Connection & Share */}
        <div className="flex items-center bg-white/5 rounded-3xl p-1 gap-1">
          <button
            id="copy-link-btn"
            onClick={copyMeetingLink}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
            title="Copy Meeting Link"
          >
            <FiShare2 size={18} />
          </button>
          
          <button
            onClick={onStatsToggle}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
            title="Sytem Stats"
          >
            <FaSignal size={16} />
          </button>
        </div>

        <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block"></div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onMuteToggle}
            className={`w-14 h-14 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 relative group ${
              muted
                ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                : 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700'
            }`}
          >
            {muted ? <FaMicrophoneSlash size={18} /> : <FaMicrophone size={18} />}
            <span className="text-[7px] font-black uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">Audio</span>
          </button>

          <button
            onClick={onVideoToggle}
            className={`w-14 h-14 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 relative group ${
              videoOff
                ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                : 'bg-indigo-600 text-white border border-white/10 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)]'
            }`}
          >
            {videoOff ? <FaVideoSlash size={18} /> : <FaVideo size={18} />}
            <span className="text-[7px] font-black uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">Video</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 bg-black/20 rounded-[2rem] p-1.5 px-3">
          <button
            onClick={onScreenShare}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              screenSharing
                ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Screen Share"
          >
            <FaDesktop size={16} />
          </button>

          <button
            onClick={onHandRaise}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              handRaised
                ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Raise Hand"
          >
            <FaHandPaper size={16} />
          </button>

          <button
            onClick={onWhiteboardToggle}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              showWhiteboard
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Whiteboard"
          >
            <FaChalkboardTeacher size={18} />
          </button>

          <button
            onClick={onToggleSidebar}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              sidebarView
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Chat & Info"
          >
            <FaCommentAlt size={16} />
          </button>
        </div>

        <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block"></div>

        {/* More & End */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button
              onClick={onMoreToggle}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                showMoreMenu ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FaEllipsisH size={18} />
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-full mb-6 right-0 w-64 bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-modalPop z-[110]">
                 <div className="space-y-1">
                    <button onClick={onSettings} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-xs font-bold text-slate-300">
                      <FaCog className="text-indigo-400" />
                      Configure Devices
                    </button>
                    <button onClick={() => onLayoutChange(layoutMode === 'grid' ? 'speaker' : 'grid')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-xs font-bold text-slate-300">
                      <div className="flex items-center gap-3">
                        <IoSwapHorizontal className="text-indigo-400" />
                        Toggle Layout
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[8px] uppercase">{layoutMode}</span>
                    </button>
                    {isInitiator && (
                      <button onClick={onMuteAll} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-all text-xs font-bold text-red-400">
                        <FaMicrophoneSlash />
                        Silence All Feeds
                      </button>
                    )}
                 </div>
                 <div className="mt-3 pt-3 border-t border-white/5">
                    <button 
                      onClick={onEndMeeting}
                      className="w-full h-11 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      {isInitiator ? 'Terminate Call' : 'Exit Session'}
                    </button>
                 </div>
              </div>
            )}
          </div>

          <button
            onClick={onLeave}
            className="h-14 px-8 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_10px_30px_rgba(239,68,68,0.3)] hover:scale-[1.05] active:scale-95 flex items-center gap-2"
          >
            <FaPhone className="rotate-[135deg]" />
            <span className="hidden sm:inline">Terminate</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// ============= AI FEATURES VIEW =============
function MeetingAIFeaturesView({ roomId }) {
  const { chatMessages } = useChat();
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');

  const extractTranscript = () => {
    const messages = chatMessages?.map(m => `${m.from?.identity || m.from?.name || 'User'}: ${m.message}`).join('\n') || '';
    return messages || "No chat messages yet.";
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h3 className="text-white font-black text-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
            <FaBrain className="text-indigo-400" />
          </div>
          Quantum AI
        </h3>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Neural Engine v4.8 Active</p>
      </div>

      <div className="flex px-6 mt-2 gap-6 border-b border-white/5">
        {[
          { id: 'insights', label: 'Insights', icon: <FaChartLine /> },
          { id: 'summary', label: 'Synthesis', icon: <FiFile /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative flex items-center gap-2 ${
              activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'insights' ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-5 bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-slate-950 rounded-[2rem] border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Sentiment Stream</span>
                 <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-black rounded-full">POSITIVE</span>
              </div>
              <div className="flex items-end gap-1 h-12 mb-4">
                {[40, 60, 80, 50, 90, 70, 40, 65, 85, 75, 45, 95].map((h, i) => (
                  <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-indigo-500/60 rounded-t-sm group-hover:bg-indigo-400 transition-all"></div>
                ))}
              </div>
              <p className="text-white/60 text-[10px] leading-relaxed font-medium">Participants are highly engaged in technical discussion.</p>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-[2rem] border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-4">Action Item Extraction</span>
              <div className="space-y-2">
                 <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="mt-1 w-3 h-3 rounded-full border-2 border-indigo-500/50 flex items-center justify-center shrink-0">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                    </div>
                    <p className="text-white text-[11px] font-medium">Verify deployment specs before Friday.</p>
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="p-5 bg-indigo-900/20 rounded-[2rem] border border-indigo-500/30 shadow-2xl mb-6">
              <p className="text-white text-xs font-bold mb-4">Generate instantaneous summary of active discussion.</p>
              <AISummaryButton meetingId={roomId} getTranscript={extractTranscript} />
            </div>
            {captionsOpen && <LiveCaptions meetingId={roomId} />}
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900/40 border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-[9px] text-slate-500 font-bold tracking-widest">NEURAL ACTIVE</span>
         </div>
         <FaLock size={10} className="text-slate-400 opacity-40" />
      </div>
    </div>
  );
}

// ============= DEVICE SETTINGS MODAL =============
function DeviceSettingsModal({
  isOpen,
  onClose,
  cameraDevices,
  audioDevices,
  selectedCamera,
  selectedAudio,
  onCameraChange,
  onAudioChange,
  videoFilter,
  onFilterChange,
  isInitiator,
  noiseSuppression,
  onNoiseSuppressionToggle
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.8)] max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto animate-modalPop">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-white font-black text-2xl tracking-tighter">Engine Calibration</h2>
            <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Hardware Interface v4.0.2</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Initiator Badge */}
        {isInitiator && (
          <div className="mb-6 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <FaShieldAlt className="text-indigo-400 text-lg" />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-wider">Host Privilege Active</p>
              <p className="text-xs text-indigo-300/60">Full administrative overrides enabled</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Camera Selection */}
          {cameraDevices.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] px-2">📹 Visual Sensor</label>
              <div className="relative group">
                <select
                  value={selectedCamera}
                  onChange={(e) => onCameraChange(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-950/40 text-white text-sm rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:outline-none transition-all appearance-none cursor-pointer group-hover:bg-slate-950/60"
                >
                  {cameraDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                      {device.label || `Camera ${device.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <FiChevronDown />
                </div>
              </div>
            </div>
          )}

          {/* Microphone Selection */}
          {audioDevices.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] px-2">🎤 Sonic Input</label>
              <div className="relative group">
                <select
                  value={selectedAudio}
                  onChange={(e) => onAudioChange(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-950/40 text-white text-sm rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:outline-none transition-all appearance-none cursor-pointer group-hover:bg-slate-950/60"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId} className="bg-slate-900">
                      {device.label || `Microphone ${device.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <FiChevronDown />
                </div>
              </div>
            </div>
          )}

          {/* Video Effects */}
          <div className="space-y-3">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] px-2">✨ Neural Filters</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'none', label: 'Raw', icon: '🎬' },
                { id: 'blur', label: 'Bokeh', icon: '🌫️' },
                { id: 'enhance', label: 'Glow', icon: '⭐' },
                { id: 'warm', label: 'Sunny', icon: '🔥' },
                { id: 'cool', label: 'Azure', icon: '❄️' },
                { id: 'b&w', label: 'Noir', icon: '⚫' }
              ].map(effect => (
                <button
                  key={effect.id}
                  onClick={() => onFilterChange(effect.id)}
                  className={`p-4 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden group/item ${
                    videoFilter === effect.id
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-[0_10px_20px_rgba(79,70,229,0.2)]'
                      : 'bg-slate-950/20 border-white/5 text-slate-500 hover:border-white/10 hover:bg-slate-950/40'
                  }`}
                >
                  <div className="text-2xl mb-1.5 transition-transform group-hover/item:scale-125">{effect.icon}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest">{effect.label}</div>
                  {videoFilter === effect.id && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_currentColor]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Processing */}
          <div className="p-6 bg-slate-950/40 rounded-[2rem] border border-white/5 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_currentColor]"></div>
               <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.15em]">Neural Processing</span>
             </div>
             <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Deep Noise Suppression', active: noiseSuppression, toggle: onNoiseSuppressionToggle },
                  { label: 'Dynamic Echo Cancellation', active: true, toggle: () => {} },
                  { label: 'Smart Gain Regulation', active: false, toggle: () => {} },
                ].map((feature, i) => (
                  <button 
                    key={i}
                    onClick={feature.toggle}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-left group"
                  >
                    <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{feature.label}</span>
                    <div className={`w-8 h-4 rounded-full relative transition-all duration-500 ${feature.active ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-500 ${feature.active ? 'left-4.5 translate-x-[1rem]' : 'left-0.5'}`}></div>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-8 h-16 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-black rounded-2xl transition-all shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 text-sm uppercase tracking-widest"
        >
          Initialize Transmission
        </button>
      </div>
    </div>
  );
}

function PremiumButton({ icon, label, onClick, active = false, size = 'md' }) {
  const sizeClass = {
    sm: 'h-10 w-10 text-base',
    md: 'h-11 w-11 text-lg',
    lg: 'h-12 px-6 text-lg'
  }[size];

  const bgClass = active 
    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-white/10';

  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        rounded-xl font-semibold transition-all flex items-center justify-center gap-2
        ${sizeClass}
        ${bgClass}
      `}
    >
      {icon}
      {size === 'lg' && <span className="hidden sm:inline text-sm">{label}</span>}
    </button>
  );
}

// ============= PREMIUM PRE-JOIN SCREEN =============
function PremiumPreJoinScreen({ onJoin, username, roomId, roomInfo = {} }) {
  const [videoTrack, setVideoTrack] = useState(null);
  const videoRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [guestName, setGuestName] = useState('');

  const activeTrackRef = useRef(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        const mics = devices.filter(d => d.kind === 'audioinput');
        setCameraDevices(cameras);
        setAudioDevices(mics);
        if (cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(cameras[0].deviceId);
        }
        if (mics.length > 0 && !selectedAudio) {
          setSelectedAudio(mics[0].deviceId);
        }
      } catch (e) {
        console.error("Failed to enumerate devices", e);
      }
    };

    loadDevices();
  }, []);

  useEffect(() => {
    const enableVideo = async () => {
      try {
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
          setError("Camera access requires a secure connection (HTTPS). Please use localhost or a secure tunnel.");
          setVideoEnabled(false);
          return;
        }

        setError(null);
        let track;
        try {
          const constraints = {
            resolution: { width: 1280, height: 720 },
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined
          };
          track = await createLocalVideoTrack(constraints);
        } catch (hdError) {
          console.warn("HD/Specific camera failed, trying fallback...", hdError);
          // Fallback to basic requirements
          track = await createLocalVideoTrack({
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined
          });
        }
        
        activeTrackRef.current = track;
        setVideoTrack(track);
        if (videoRef.current) {
          track.attach(videoRef.current);
        }
      } catch (e) {
        console.error("Failed to acquire camera", e);
        let errorMessage = "Camera not available";
        if (e.name === 'NotAllowedError' || (e.message && e.message.includes("Permission"))) {
          errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
        } else if (e.name === 'NotFoundError') {
          errorMessage = "No camera found on this device.";
        } else if (e.name === 'NotReadableError') {
          errorMessage = "Camera is already in use by another application or blocked.";
        } else if (e.name === 'OverconstrainedError') {
          errorMessage = "Selected camera does not support requested settings.";
        }
        
        setError(errorMessage);
        setVideoEnabled(false);
      }
    };

    if (videoEnabled) {
      enableVideo();
    } else {
      if (activeTrackRef.current) {
        activeTrackRef.current.stop();
        activeTrackRef.current.detach();
        activeTrackRef.current = null;
        setVideoTrack(null);
      }
    }

    return () => {
      if (activeTrackRef.current) {
        activeTrackRef.current.stop();
        activeTrackRef.current.detach();
        activeTrackRef.current = null;
      }
    };
  }, [videoEnabled, selectedCamera]);

  return (
    <div className="flex h-screen w-full items-center justify-center p-4" style={{ background: 'var(--vb-bg-root)' }}>
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none"></div>

      {/* Main Container */}
      <div className="relative w-full max-w-2xl flex flex-col gap-0 z-10">

        {/* Video Preview Card - Large */}
        <div className="relative aspect-video w-full bg-black rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] border-4 border-indigo-500/20 group mb-8 p-1">
          <div className="w-full h-full rounded-[2.2rem] overflow-hidden relative">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-1000 ${
                videoEnabled && !error ? 'opacity-100' : 'opacity-0'
              }`} 
            />

            {/* Avatar Fallback */}
            {(!videoEnabled || error) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 animate-pulse">
                <div className="text-center">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white text-7xl font-black shadow-2xl border-8 border-white/10 scale-110">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-black/40 backdrop-blur-xl px-6 py-2 rounded-2xl border border-white/10 mt-10">
                    <p className="text-indigo-300 text-xs font-black uppercase tracking-[0.2em]">{error || 'Optical Feed Disabled'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* HD Badge */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-indigo-600/90 px-4 py-2 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md">
              <span className="text-[10px] text-white font-black uppercase tracking-widest">Ultra-HD Low Latency</span>
            </div>

            {/* Network Quality */}
            <div className="absolute top-6 left-6 bg-slate-950/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex gap-1.5 items-end">
               <div className="w-1.5 h-3 bg-green-500 rounded-full animate-pulse"></div>
               <div className="w-1.5 h-4 bg-green-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
               <div className="w-1.5 h-5 bg-green-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
               <span className="text-[10px] text-white/50 font-bold ml-1 uppercase tracking-tighter">Excellent Link</span>
            </div>

            {/* Privacy Shield */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
               <div className={`w-3 h-3 rounded-full ${videoEnabled ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}></div>
               <span className="text-[10px] text-white/80 font-black uppercase tracking-widest">Privacy {videoEnabled ? 'Active' : 'Locked'}</span>
            </div>
          </div>
        </div>

        {/* User Info & Meeting Details - Bottom Section */}
        <div className="rounded-3xl p-8 border shadow-2xl" style={{ background: 'var(--mt-bg-card)', borderColor: 'var(--mt-border)' }}>
          
          {/* Name Input */}
          <div className="mb-8 relative group">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-3 block px-1">Identity Override</label>
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 group-focus-within:scale-110 transition-transform">
                <FaUser />
              </div>
              {username === 'Guest' ? (
                <input
                  type="text"
                  placeholder="Designate your callsign..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-slate-900/60 border-2 border-white/5 text-white placeholder-slate-600 rounded-3xl pl-16 pr-8 py-5 text-sm focus:outline-none focus:border-indigo-600/50 transition-all font-black tracking-tight"
                />
              ) : (
                <div className="w-full bg-indigo-600/10 border-2 border-indigo-500/20 rounded-3xl pl-16 pr-8 py-5 text-white font-black tracking-tight flex items-center justify-between">
                   <span>{username}</span>
                   <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/10">AUTHENTICATED</span>
                </div>
              )}
            </div>
          </div>

          {/* Device Controls - High Visibility */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`flex-1 group relative h-20 rounded-[1.8rem] transition-all duration-500 flex flex-col items-center justify-center gap-1 border-2 ${
                audioEnabled
                  ? 'bg-green-600/10 border-green-500/30 text-green-400 hover:bg-green-600/20'
                  : 'bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20'
              }`}
            >
              <div className="text-xl group-hover:scale-110 transition-transform">
                {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{audioEnabled ? 'Mic Active' : 'Mic Muted'}</span>
            </button>

            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`flex-1 group relative h-20 rounded-[1.8rem] transition-all duration-500 flex flex-col items-center justify-center gap-1 border-2 ${
                videoEnabled && !error
                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20'
                  : 'bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20'
              }`}
            >
              <div className="text-xl group-hover:scale-110 transition-transform">
                {videoEnabled && !error ? <FaVideo /> : <FaVideoSlash />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{videoEnabled && !error ? 'Feed Active' : 'Feed Locked'}</span>
            </button>

            <button
              onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              className="w-20 h-20 bg-slate-900/60 border-2 border-white/5 rounded-[1.8rem] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/10 transition-all group"
            >
              <FaCog className="text-xl group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          {/* Join Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => onJoin({ videoEnabled: videoEnabled && !error, audioEnabled }, guestName)}
              className="w-full h-16 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-black rounded-2xl transition-all shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_25px_50px_rgba(79,70,229,0.4)] text-lg transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 group"
            >
              <span>Securely Join Room</span>
              <FaVideo className="group-hover:rotate-12 transition-transform" />
            </button>

            <button
              onClick={() => onJoin({ videoEnabled: false, audioEnabled }, guestName)}
              className="w-full h-12 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold rounded-xl border border-white/5 transition-all text-sm flex items-center justify-center gap-2"
            >
              <FaVideoSlash size={14} className="opacity-50" />
              Join without Video Emission
            </button>
          </div>

          {/* Audio/Video Controls */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">Before you join</p>
            <div className="flex gap-3">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm ${
                  audioEnabled
                    ? 'bg-green-600/20 text-green-300 border border-green-600/40'
                    : 'bg-red-600/20 text-red-300 border border-red-600/40'
                }`}
                title={audioEnabled ? "Mute" : "Unmute"}
              >
                {audioEnabled ? <FaMicrophone size={14} /> : <FaMicrophoneSlash size={14} />}
                {audioEnabled ? 'Microphone on' : 'Microphone off'}
              </button>
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm ${
                  videoEnabled && !error
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-600/40'
                    : 'bg-red-600/20 text-red-300 border border-red-600/40'
                }`}
                title={videoEnabled ? "Camera On" : "Camera Off"}
              >
                {videoEnabled && !error ? <FaVideo size={14} /> : <FaVideoSlash size={14} />}
                {videoEnabled && !error ? 'Camera on' : 'Camera off'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetworkIntelligencePanel({ onClose, quality }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-6 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[3rem] p-8 shadow-2xl space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
               <FaSignal className="text-indigo-400" />
             </div>
             Net-Intel Node
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all transform hover:rotate-90">
             <FaTimes size={18} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-950/40 rounded-[2rem] border border-white/5 flex items-center justify-between">
             <div className="space-y-1">
               <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Uplink Quality</span>
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${quality === 'Excellent' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse shadow-[0_0_8px_currentColor]`}></div>
                 <span className="text-white font-black uppercase tracking-tight">{quality}</span>
               </div>
             </div>
             <div className="text-right">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Latency</span>
               <span className="text-indigo-400 font-black">24ms</span>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {[
               { label: 'Packet Loss', value: '0.02%', color: 'text-green-400' },
               { label: 'Jitter', value: '4ms', color: 'text-indigo-400' },
               { label: 'Bitrate', value: '2.4 Mbps', color: 'text-white' },
               { label: 'Encryption', value: 'AES-256', color: 'text-slate-500' }
             ].map((stat, i) => (
               <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">{stat.label}</span>
                 <span className={`text-xs font-black ${stat.color}`}>{stat.value}</span>
               </div>
             ))}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-2xl transition-all"
        >
          Close Diagnostics
        </button>
      </div>
    </div>
  );
}
// Add custom CSS to fix LiveKit grid layout issues and sidebar positioning
const MeetingStyles = () => (
  <style>{`
    .premium-lk-grid {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      height: 100% !important;
      justify-content: center !important;
      align-items: center !important;
    }

    .lk-grid-layout {
      width: 100% !important;
      height: 100% !important;
      display: grid !important;
      gap: 2rem !important;
      padding: 2rem !important;
      align-content: center !important;
      justify-content: center !important;
      justify-items: center !important;
      align-items: center !important;
    }

    .lk-participant-tile {
      max-width: 100% !important;
      max-height: 100% !important;
      aspect-ratio: 16 / 9 !important;
      width: 100% !important;
      height: auto !important;
    }

    .premium-lk-grid .lk-grid-layout > * {
       width: 100% !important;
       height: 100% !important;
       max-width: 900px !important;
       max-height: 500px !important;
    }
    .lk-tile-custom {
      border: none !important;
      background: var(--mt-bg-card) !important;
      border-radius: 2.5rem !important;
      overflow: hidden !important;
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 10px 30px var(--vb-dock-shadow) !important;
    }

    .lk-participant-tile {
      width: 100% !important;
      height: 100% !important;
    }

    .lk-video-container {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
    }

    /* Fix for sidebar and main content distribution */
    .premium-sidebar-container {
      transition: all 0.5s var(--ease-spring);
    }

    @media (max-width: 768px) {
      .premium-sidebar-container {
        width: 100% !important;
        position: absolute !important;
        inset: 0 !important;
      }
    }

    /* Custom scrollbar for sidebar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    /* Ensure avatars are centered in tiles */
    .lk-participant-placeholder {
      background: radial-gradient(circle at center, var(--mt-bg-card) 0%, var(--mt-bg-root) 100%) !important;
    }

    /* Operational Sidebar Content Fixes */
    .operational-interface-content {
      padding-bottom: 2rem;
    }

    .breakout-room-node {
      margin-bottom: 1.5rem;
      border-radius: 2rem !important;
    }

    /* SILENCE DEFAULT LIVEKIT UI CRUFT */
    .lk-audio-bar, .lk-control-bar, .lk-settings-menu {
      display: none !important;
    }

    .lk-video-conference {
      border: none !important;
    }
  `}</style>
);
