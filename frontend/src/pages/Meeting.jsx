import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  LayoutContextProvider,
  useTracks,
  useRoomContext,
  useChat,
  useParticipants
} from '@livekit/components-react';
import { Track, createLocalVideoTrack, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import './Meeting.css';

import {
  FaUsers,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaShieldAlt,
  FaRegClock,
  FaSignal,
  FaCommentAlt,
  FaTimes,
  FaPaperPlane,
  FaDotCircle,
  FaCircle,
  FaPhone,
  FaHandPaper,
  FaCog,
  FaDesktop,
  FaStopCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaVolumeOff,
  FaCheck,
  FaEllipsisH
} from 'react-icons/fa';
import { IoNotifications, IoSwapHorizontal } from 'react-icons/io5';
import { getApiUrl } from "../utils/api";
import AISummaryButton from '../components/AISummaryButton';
import LiveCaptions from '../components/LiveCaptions';
import { useNotify } from '../components/NotificationProvider';

export default function Meeting({ roomId: propRoomId }) {
  const { roomId: paramRoomId } = useParams();
  const roomId = propRoomId || paramRoomId;
  const navigate = useNavigate();
  const { user, token: authToken } = useAuthStore();

  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [meetingMeta, setMeetingMeta] = useState(null);
  const [error, setError] = useState(null);
  const [shouldJoin, setShouldJoin] = useState(false);
  const [preJoinChoices, setPreJoinChoices] = useState({ videoEnabled: true, audioEnabled: true });

  // Fetch LiveKit credentials
  useEffect(() => {
    async function fetchToken() {
      try {
        const apiUrl = getApiUrl();
        const endpoints = [
          `${apiUrl}/meeting-livekit/token`,
          `${apiUrl}/livekit/token`,
          `${apiUrl}/meeting/token`
        ];

        let data = null;
        let lastErr = null;

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ room_id: roomId })
            });

            if (res.ok) {
              data = await res.json();
              if (data.token) break;
            }
          } catch (e) {
            lastErr = e;
          }
        }

        if (!data) throw lastErr || new Error("Failed to get token");

        setLivekitToken(data.token);
        setMeetingMeta({ started_at: data.started_at, duration_minutes: data.duration_minutes });

        let url = data.url || data.serverUrl || "";
        if (url.startsWith('http')) url = url.replace('http', 'ws');
        setLivekitUrl(url);

      } catch (err) {
        console.error(err);
        setError(err.message || "Connection failed");
      }
    }

    if (authToken && roomId) {
      fetchToken();
    }
  }, [authToken, roomId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-slate-950 to-black text-red-500 font-medium">
        <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-red-500/20 max-w-md text-center">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaShieldAlt className="text-2xl text-red-500" />
          </div>
          <h3 className="text-xl text-white mb-2 font-bold">Connection Error</h3>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-500 hover:to-red-600 text-white transition-all shadow-lg font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!livekitToken || !livekitUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-950 via-blue-950/20 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black z-0"></div>
        <div className="z-10 bg-slate-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300 font-semibold animate-pulse">Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-black overflow-hidden meeting-root transition-colors duration-300">
      {!shouldJoin ? (
        <PremiumPreJoinScreen
          onJoin={(choices) => {
            setPreJoinChoices(choices);
            setShouldJoin(true);
          }}
          username={user?.full_name || user?.username || 'Guest'}
          roomId={roomId}
        />
      ) : (
        <LiveKitRoom
          video={preJoinChoices.videoEnabled}
          audio={preJoinChoices.audioEnabled}
          token={livekitToken}
          serverUrl={livekitUrl}
          data-lk-theme="default"
          style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
        >
          <LayoutContextProvider>
            <PremiumRoomInner roomId={roomId} onLeave={() => navigate('/')} meetingMeta={meetingMeta} />
          </LayoutContextProvider>
        </LiveKitRoom>
      )}
    </div>
  );
}

// ============= PREMIUM ROOM INNER =============
function PremiumRoomInner({ roomId, onLeave, meetingMeta }) {
  const [sidebarView, setSidebarView] = useState(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [handsRaised, setHandsRaised] = useState(new Set());
  const [reactions, setReactions] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [videoFilter, setVideoFilter] = useState('none');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isInitiator, setIsInitiator] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [speakingParticipant, setSpeakingParticipant] = useState(null);

  const room = useRoomContext();
  const participants = useParticipants();
  const notify = useNotify();

  // Load available devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        const mics = devices.filter(d => d.kind === 'audioinput');
        setCameraDevices(cameras);
        setAudioDevices(mics);
        if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0].deviceId);
        if (mics.length > 0 && !selectedAudio) setSelectedAudio(mics[0].deviceId);
      } catch (e) {
        console.error("Failed to enumerate devices", e);
      }
    };
    loadDevices();
  }, []);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // Track speaking participants
  useEffect(() => {
    const speakingParts = participants.filter(p => p.isSpeaking);
    if (speakingParts.length > 0) {
      setSpeakingParticipant(speakingParts[0].identity);
    } else {
      setSpeakingParticipant(null);
    }
  }, [participants]);

  // State for persistent chat messages
  const [chatMessages, setChatMessages] = useState([]);

  // Handle data messages (hands, reactions, chat)
  useEffect(() => {
    if (!room) return;
    const handleData = (payload, participant, kind, topic) => {
      const str = new TextDecoder().decode(payload);

      // Handle Chat
      if (topic === 'lk-chat-topic') {
        const timestamp = Date.now();
        try {
          const data = JSON.parse(str);
          if (data && data.type === 'dm') {
            setChatMessages(prev => [...prev, {
              message: data.content,
              timestamp,
              from: participant,
              isPrivate: true,
              recipientId: 'Me'
            }]);
            return;
          }
        } catch (e) { }

        // Public message
        setChatMessages(prev => [...prev, {
          message: str,
          timestamp,
          from: participant,
          isPrivate: false
        }]);
        return;
      }

      // Handle other events (hands, reactions)
      const data = JSON.parse(str);

      if (topic === 'hand-raise') {
        setHandsRaised(prev => {
          const newSet = new Set(prev);
          if (data.raised) newSet.add(participant.identity);
          else newSet.delete(participant.identity);
          return newSet;
        });
      }

      if (topic === 'reaction') {
        // Show reaction
        setReactions(prev => ({ ...prev, [participant.identity]: data.reaction }));
        // Clear after 3s
        setTimeout(() => {
          setReactions(prev => {
            const next = { ...prev };
            if (next[participant.identity] === data.reaction) {
              delete next[participant.identity];
            }
            return next;
          })
        }, 3000);
      }
    };

    // Data Listeners
    room.on(RoomEvent.DataReceived, handleData);

    // Connection Listeners
    const handleConnect = (p) => notify('success', `${p.identity} joined`);
    const handleDisconnect = (p) => notify('info', `${p.identity} left`);

    room.on(RoomEvent.ParticipantConnected, handleConnect);
    room.on(RoomEvent.ParticipantDisconnected, handleDisconnect);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.ParticipantConnected, handleConnect);
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnect);
    };
  }, [room, notify]);


  const toggleRaiseHand = async () => {
    const newState = !handRaised;
    setHandRaised(newState);
    const myId = room.localParticipant.identity;

    setHandsRaised(prev => {
      const newSet = new Set(prev);
      if (newState) newSet.add(myId);
      else newSet.delete(myId);
      return newSet;
    });

    const data = JSON.stringify({ raised: newState });
    await room.localParticipant.publishData(new TextEncoder().encode(data), { topic: 'hand-raise', reliable: true });
  };

  const sendReaction = async (emoji) => {
    const myId = room.localParticipant.identity;
    setReactions(prev => ({ ...prev, [myId]: emoji }));
    setTimeout(() => {
      setReactions(prev => {
        const next = { ...prev };
        if (next[myId] === emoji) delete next[myId];
        return next;
      })
    }, 3000);

    const data = JSON.stringify({ reaction: emoji });
    await room.localParticipant.publishData(new TextEncoder().encode(data), { topic: 'reaction', reliable: true });
  };

  const toggleAudio = async () => {
    const newState = !muted;
    setMuted(newState);
    if (room.localParticipant) await room.localParticipant.setMicrophoneEnabled(!newState);
  };

  const toggleVideo = async () => {
    const newState = !videoOff;
    setVideoOff(newState);
    if (room.localParticipant) await room.localParticipant.setCameraEnabled(!newState);
  };

  const toggleScreenShare = async () => {
    const newState = !screenSharing;
    try {
      await room.localParticipant.setScreenShareEnabled(newState);
      setScreenSharing(newState);
    } catch (e) {
      console.error("Failed to toggle screen share", e);
      // Determine if it was a permission error or user cancellation
      setScreenSharing(false);
    }
  };

  const layoutParams = getGridLayout(participants.length, speakingParticipant);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 via-gray-100 to-white dark:from-slate-950 dark:via-slate-950 dark:to-black text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Premium Header */}
      <PremiumMeetingHeader
        roomId={roomId}
        recordingActive={recordingActive}
        handsRaised={handsRaised}
        isInitiator={isInitiator}
        participantCount={participants.length}
        meetingMeta={meetingMeta}
        onLeave={onLeave}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-0">
        <div className="flex-1 relative bg-gradient-to-b from-gray-50/50 to-white dark:from-slate-950/50 dark:to-black flex flex-col transition-colors duration-300">
          {/* Video Grid */}
          <div className={`flex-1 p-4 overflow-auto`}>
            {/* Speaker Focus Area */}
            {speakingParticipant && tracks.length > 2 && (
              <div className="mb-4">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border-2 border-blue-500/50 aspect-video max-h-[40vh] mx-auto">
                  {tracks.filter(t => t.participant.identity === speakingParticipant).map(track => (
                    <ParticipantTile key={`${track.participant.identity}-${track.source}`} trackRef={track} className="w-full h-full" />
                  ))}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-blue-600/90 px-4 py-2 rounded-lg backdrop-blur-sm shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white font-semibold text-sm">Now Speaking</span>
                  </div>
                  {/* Reaction */}
                  {reactions[speakingParticipant] && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-6xl animate-bounce drop-shadow-lg filter z-50">
                      {reactions[speakingParticipant]}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grid */}
            <div className={`grid ${layoutParams.gridSize} gap-4 auto-rows-fr`}>
              {participants.length > 0 ? (
                participants.map(p => {
                  // Find relevant tracks for this participant
                  const cameraTrack = tracks.find(t => t.participant.identity === p.identity && t.source === Track.Source.Camera);
                  const screenTrack = tracks.find(t => t.participant.identity === p.identity && t.source === Track.Source.ScreenShare);
                  const trackToRender = screenTrack || cameraTrack;

                  return (
                    <div key={p.identity} className="relative rounded-2xl overflow-hidden shadow-md dark:shadow-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all group aspect-video">
                      {trackToRender ? (
                        <ParticipantTile trackRef={trackToRender} className="w-full h-full lk-participant-tile" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 transition-colors duration-300">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3">
                            {p.name ? p.name.charAt(0).toUpperCase() : p.identity.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-slate-900 dark:text-white font-semibold text-lg">{p.name || p.identity}</span>
                            <div className="flex items-center gap-2 mt-1">
                              {p.isSpeaking && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {p.isSpeaking ? 'Speaking' : 'Audio Only'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Hand Raise */}
                      {handsRaised.has(p.identity) && (
                        <div className="absolute top-2 right-2 bg-amber-500 p-2 rounded-full text-white animate-bounce z-10 shadow-lg">
                          <FaHandPaper size={16} />
                        </div>
                      )}

                      {/* Reaction */}
                      {reactions[p.identity] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
                          <div className="text-6xl animate-bounce drop-shadow-xl filter">
                            {reactions[p.identity]}
                          </div>
                        </div>
                      )}

                      {/* Name Overlay (Only show if video is rendering, otherwise fallback shows it) */}
                      {trackToRender && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <span className="text-white font-semibold text-sm text-shadow-sm flex items-center gap-2">
                            {p.name || p.identity}
                            {p.isSpeaking && <FaMicrophone size={12} className="text-green-400" />}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full flex items-center justify-center h-full">
                  <p className="text-slate-500">Waiting for participants...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <PremiumSidebar
          view={sidebarView}
          onViewChange={setSidebarView}
          handsRaised={handsRaised}
          isInitiator={isInitiator}
          roomId={roomId}
          onReaction={sendReaction}
          chatMessages={chatMessages}
          onChatMessageAdd={(msg) => setChatMessages(prev => [...prev, msg])}
        />
      </div>

      {/* Control Bar */}
      <AdvancedControlBar
        onLeave={onLeave}
        sidebarView={sidebarView}
        onToggleSidebar={(v) => setSidebarView(sidebarView === v ? null : v)}
        recordingActive={recordingActive}
        onRecordingToggle={() => setRecordingActive(!recordingActive)}
        handRaised={handRaised}
        onHandRaise={toggleRaiseHand}
        muted={muted}
        onMuteToggle={toggleAudio}
        videoOff={videoOff}
        onVideoToggle={toggleVideo}
        onSettings={() => setShowSettings(!showSettings)}
        onMoreToggle={() => setShowMoreMenu(!showMoreMenu)}
        showMoreMenu={showMoreMenu}
        screenSharing={screenSharing}
        onScreenShare={toggleScreenShare}
        isInitiator={isInitiator}
        noiseSuppression={noiseSuppression}
        onNoiseSuppressionToggle={() => setNoiseSuppression(!noiseSuppression)}
        cameraDevices={cameraDevices}
        selectedCamera={selectedCamera}
        onCameraChange={setSelectedCamera}
      />

      {/* Settings Modal Stub */}
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

function stepsShouldShowInGrid(track, speakerId, count) {
  if (!speakerId) return true;
  if (count <= 2) return true;
  return track.participant.identity !== speakerId;
}

function getGridLayout(count, hasSpeaker) {
  if (hasSpeaker && count > 2) {
    const remaining = count - 1;
    if (remaining <= 2) return { gridSize: 'grid-cols-2' };
    if (remaining <= 4) return { gridSize: 'grid-cols-2' };
    return { gridSize: 'grid-cols-3' };
  }
  if (count <= 1) return { gridSize: 'grid-cols-1' };
  if (count <= 4) return { gridSize: 'grid-cols-2' };
  if (count <= 9) return { gridSize: 'grid-cols-3' };
  return { gridSize: 'grid-cols-4' };
}


// ... Components ...

function PremiumMeetingHeader({ roomId, recordingActive, handsRaised, isInitiator, participantCount, meetingMeta, onLeave }) {
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const notify = useNotify();

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!meetingMeta?.started_at || !meetingMeta?.duration_minutes) return;

    let startStr = meetingMeta.started_at;
    if (!startStr.endsWith('Z') && !startStr.includes('+')) startStr += 'Z';
    const startTime = new Date(startStr).getTime();
    const durationMs = meetingMeta.duration_minutes * 60 * 1000;
    const endTime = startTime + durationMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      setTimeLeft(diff);

      // Alert at 10 minutes (logic checks bounds to avoid spamming)
      // We check if we are within the 10th minute window (600000ms)
      // Since interval is 1s, we can check a small range.
      if (diff <= 600000 && diff > 599000) {
        notify('warning', 'Meeting will end in 10 minutes');
      }

      if (diff <= 0) {
        notify('error', 'Meeting has ended');
        if (onLeave) onLeave();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [meetingMeta, notify, onLeave]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-16 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-6 shadow-md z-20 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <h2 className="text-slate-800 dark:text-white font-bold text-lg hidden sm:block">SCCCS Meeting</h2>
        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-500 dark:text-slate-300 font-mono border border-slate-200 dark:border-white/10 transition-colors duration-300">
          ID: {roomId}
        </div>
        {recordingActive && (
          <div className="flex items-center gap-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 rounded text-red-600 dark:text-red-400 text-xs animate-pulse">
            <FaDotCircle /> REC
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {timeLeft !== null ? (
              <>
                <FaRegClock className={timeLeft < 600000 ? "text-red-500 animate-pulse" : "text-blue-600 dark:text-blue-400"} />
                <span className={timeLeft < 600000 ? "text-red-500 font-bold" : ""}>
                  {formatTime(Math.max(0, Math.floor(timeLeft / 1000)))} Left
                </span>
              </>
            ) : (
              <>
                <FaRegClock className="text-blue-600 dark:text-blue-400" /> {formatTime(elapsed)}
              </>
            )}
          </div>
          <div className="w-px h-4 bg-slate-300 dark:bg-white/20"></div>
          <div className="flex items-center gap-2">
            <FaUsers className="text-purple-600 dark:text-purple-400" /> {participantCount}
          </div>
          {handsRaised.size > 0 && (
            <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1"><FaHandPaper /> {handsRaised.size}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PremiumSidebar({
  view,
  onViewChange,
  handsRaised,
  isInitiator,
  roomId,
  onReaction,
  chatMessages,
  onChatMessageAdd
}) {
  if (!view) return null;

  return (
    <div className="w-80 bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col h-full z-20 transition-all duration-300">
      <div className="flex border-b border-slate-200 dark:border-white/10">
        <button onClick={() => onViewChange('chat')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${view === 'chat' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>Chat</button>
        <button onClick={() => onViewChange('participants')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${view === 'participants' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>People</button>
        <button onClick={() => onViewChange('reactions')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${view === 'reactions' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>React</button>
        <button onClick={() => onViewChange('ai')} className={`flex-1 py-3 text-sm font-semibold border-b-2 flex items-center justify-center gap-1 ${view === 'ai' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>AI</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
        {view === 'chat' && <PremiumChatView messages={chatMessages} onAddMessage={onChatMessageAdd} />}
        {view === 'participants' && <PremiumParticipantsView handsRaised={handsRaised} />}
        {view === 'reactions' && <PremiumReactionsView onReaction={onReaction} />}
        {view === 'ai' && <AIFeaturesView roomId={roomId} />}
      </div>
    </div>
  );
}

function PremiumChatView({ messages, onAddMessage }) {
  const [msg, setMsg] = useState('');
  const [recipient, setRecipient] = useState('everyone');
  const bottomRef = useRef(null);
  const room = useRoomContext();
  const participants = useParticipants();

  // Filter out self from potential recipients list
  const potentialRecipients = participants.filter(p => p.identity !== room.localParticipant.identity);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;

    if (recipient === 'everyone') {
      // Public Message: Send plain text to be compatible with standard LiveKit chat
      const data = new TextEncoder().encode(msg);
      await room.localParticipant.publishData(data, {
        topic: 'lk-chat-topic',
        reliable: true
      });

      // Add to local state via prop
      onAddMessage({
        message: msg,
        timestamp: Date.now(),
        from: room.localParticipant,
        isPrivate: false
      });

    } else {
      // Direct Message: Send JSON wrapper
      const payload = JSON.stringify({ type: 'dm', content: msg });
      const data = new TextEncoder().encode(payload);
      await room.localParticipant.publishData(data, {
        topic: 'lk-chat-topic',
        reliable: true,
        destinationIdentities: [recipient]
      });

      // Add to local state via prop
      onAddMessage({
        message: msg,
        timestamp: Date.now(),
        from: room.localParticipant,
        isPrivate: true,
        recipientId: participants.find(p => p.identity === recipient)?.name || recipient
      });
    }
    setMsg('');
  }

  // Helper to render text with mentions and links
  const renderContent = (text) => {
    return text.split(' ').map((word, i) => {
      if (word.startsWith('@')) {
        return <span key={i} className="text-blue-500 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{word} </span>
      }
      return word + ' ';
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 space-y-4">
        {messages.length === 0 && <p className="text-center text-slate-500 text-sm mt-4">No messages yet.</p>}
        {messages.map((m, i) => {
          const isMe = m.from?.identity === room.localParticipant.identity;
          const isDM = m.isPrivate;

          return (
            <div key={i} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isMe ? 'You' : (m.from?.name || m.from?.identity || 'Unknown')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm break-words shadow-sm ${isMe
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                  } ${isDM ? 'border-2 border-amber-400/50' : ''}`}
              >
                {/* DM Indicator */}
                {isDM && (
                  <div className="text-[10px] font-bold mb-1 opacity-80 uppercase tracking-wide flex items-center gap-1">
                    {isMe ? `To: ${m.recipientId}` : '(Direct Message)'}
                  </div>
                )}

                {renderContent(m.message)}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-colors duration-300">
        {/* Recipient Selector */}
        <div className="mb-2">
          <select
            className="w-full text-xs p-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-colors"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          >
            <option value="everyone">Everyone</option>
            {potentialRecipients.map(p => (
              <option key={p.identity} value={p.identity}>{p.name || p.identity}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 border border-slate-200 dark:border-white/10 focus:border-blue-500 outline-none transition-colors duration-300"
            placeholder={recipient === 'everyone' ? "Type a message..." : `Message ${participants.find(p => p.identity === recipient)?.name || recipient}...`}
            value={msg}
            onChange={e => setMsg(e.target.value)}
          />
          <button type="submit" className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 shadow-sm"><FaPaperPlane /></button>
        </form>
      </div>
    </div>
  )
}

function PremiumParticipantsView({ handsRaised }) {
  const participants = useParticipants();
  return (
    <div className="p-4 space-y-3">
      {participants.map(p => (
        <div key={p.identity} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-slate-200 dark:hover:border-white/5 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {(p.name || p.identity).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{p.name || p.identity}</p>
              <p className="text-xs text-slate-500">{p.isSpeaking ? 'Speaking...' : 'In meeting'}</p>
            </div>
          </div>
          <div className="flex gap-2 text-slate-400">
            {handsRaised.has(p.identity) && <span className="text-amber-500">✋</span>}
            {p.isMicrophoneEnabled ? <FaMicrophone size={12} className="text-slate-500 dark:text-slate-400" /> : <FaMicrophoneSlash size={12} className="text-red-500 dark:text-red-400" />}
          </div>
        </div>
      ))}
    </div>
  )
}

function PremiumReactionsView({ onReaction }) {
  const emojis = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '🙌', '🤔', '👀', '💯'];
  return (
    <div className="p-6">
      <div className="bg-slate-100 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-white/5 transition-colors duration-300">
        <h3 className="font-bold mb-4 text-center text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">Send a Reaction</h3>
        <div className="grid grid-cols-4 gap-3">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              className="text-2xl hover:bg-white/50 dark:hover:bg-white/10 hover:scale-110 p-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex justify-center items-center shadow-sm hover:shadow-md"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500">Reactions disappear after a few seconds</p>
      </div>
    </div>
  )
}


function AIFeaturesView({ roomId }) {
  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4 transition-colors duration-300">
        <h3 className="text-indigo-600 dark:text-indigo-300 font-bold text-sm mb-3 flex items-center gap-2">
          AI Meeting Assistant
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          Generate an instant summary of the conversation so far.
        </p>
        <AISummaryButton
          meetingId={roomId}
          getTranscript={() => "Meeting transcript placeholder..."}
        />
      </div>

      <div className="bg-slate-100 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-xl p-4 transition-colors duration-300">
        <h4 className="text-slate-700 dark:text-slate-300 font-semibold text-xs mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span> Live Captions
        </h4>
        <div className="h-40 overflow-y-auto bg-white dark:bg-black/20 rounded p-2 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 text-sm">
          <LiveCaptions />
        </div>
      </div>
    </div>
  )
}

function AdvancedControlBar({
  onLeave, sidebarView, onToggleSidebar,
  muted, onMuteToggle, videoOff, onVideoToggle,
  handRaised, onHandRaise, screenSharing, onScreenShare,
  onSettings, onMoreToggle, showMoreMenu
}) {
  return (
    <div className="h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-4 relative z-30 shadow-2xl transition-colors duration-300">

      <ControlBtn
        onClick={onMuteToggle}
        active={!muted}
        icon={muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        label={muted ? "Unmute" : "Mute"}
        danger={muted}
      />

      <ControlBtn
        onClick={onVideoToggle}
        active={!videoOff}
        icon={videoOff ? <FaVideoSlash /> : <FaVideo />}
        label={videoOff ? "Start Video" : "Stop Video"}
        danger={videoOff}
      />

      <ControlBtn
        onClick={onScreenShare}
        active={screenSharing}
        icon={screenSharing ? <FaStopCircle /> : <FaDesktop />}
        label={screenSharing ? "Stop Share" : "Share"}
        color="green"
      />

      <div className="w-px h-10 bg-slate-300 dark:bg-white/10 mx-2"></div>

      <ControlBtn
        onClick={() => onToggleSidebar('chat')}
        active={sidebarView === 'chat'}
        icon={<FaCommentAlt />}
        label="Chat"
      />

      <ControlBtn
        onClick={() => onToggleSidebar('participants')}
        active={sidebarView === 'participants'}
        icon={<FaUsers />}
        label="People"
      />

      <ControlBtn
        onClick={() => onToggleSidebar('reactions')}
        active={sidebarView === 'reactions'}
        icon={<span className="text-lg">👍</span>}
        label="React"
      />

      <ControlBtn
        onClick={onHandRaise}
        active={handRaised}
        icon={<FaHandPaper />}
        label="Raise Hand"
        color="amber"
      />

      <button onClick={onSettings} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all ml-2">
        <FaCog />
      </button>

      <button onClick={onLeave} className="ml-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2">
        <FaPhone className="text-sm" /> End
      </button>
    </div>
  )
}

function ControlBtn({ onClick, active, icon, label, danger, color }) {
  let bg = active ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white";
  if (danger) bg = "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200 dark:bg-red-500/20 dark:text-red-500 dark:hover:bg-red-500/30 dark:border-red-500/50";
  if (color === 'green' && active) bg = "bg-green-500 text-white shadow-lg shadow-green-500/40";
  if (color === 'amber' && active) bg = "bg-amber-500 text-white shadow-lg shadow-amber-500/40";

  return (
    <div className="flex flex-col items-center gap-1 group w-16">
      <button onClick={onClick} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all border border-slate-200 dark:border-white/5 ${bg}`}>
        {icon}
      </button>
      <span className="text-[10px] text-slate-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white px-2 py-1 rounded whitespace-nowrap pointer-events-none shadow-lg">
        {label}
      </span>
    </div>
  )
}

// ============= PREMIUM PRE-JOIN SCREEN =============
function PremiumPreJoinScreen({ onJoin, username, roomId }) {
  const [videoTrack, setVideoTrack] = useState(null);
  const videoRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let track;

    // Load available devices
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        const mics = devices.filter(d => d.kind === 'audioinput');
        setCameraDevices(cameras);
        setAudioDevices(mics);
        if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0].deviceId);
        if (mics.length > 0 && !selectedAudio) setSelectedAudio(mics[0].deviceId);
      } catch (e) {
        console.error("Failed to enumerate devices", e);
      }
    };
    loadDevices();

    const enableVideo = async () => {
      try {
        setError(null);
        const constraints = { resolution: { width: 1280, height: 720 } };
        if (selectedCamera) constraints.deviceId = { exact: selectedCamera };

        // Only request video if enabled
        track = await createLocalVideoTrack(constraints);
        setVideoTrack(track);
        if (videoRef.current) track.attach(videoRef.current);
      } catch (e) {
        console.warn("Camera error", e);
        setError("Camera not available");
        setVideoEnabled(false);
      }
    };

    if (videoEnabled) enableVideo();
    else if (videoTrack) {
      videoTrack.stop();
      setVideoTrack(null);
    }

    return () => {
      if (track) { track.stop(); track.detach(); }
    };
  }, [videoEnabled, selectedCamera]);

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-slate-950 items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-gray-50 to-white dark:from-blue-900/10 dark:via-slate-950 dark:to-black pointer-events-none transition-colors duration-300"></div>

      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-fade-in-up transition-colors duration-300">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Join Meeting</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-black/30 px-2 py-0.5 rounded border border-slate-200 dark:border-white/5">ID: {roomId}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="p-6">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-white/10 mb-6 group">
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${videoEnabled ? 'opacity-100' : 'opacity-0'}`} />

            {(!videoEnabled || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 transition-colors duration-300">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2">
                  <FaVideoSlash size={24} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Camera is off</p>
              </div>
            )}

            {/* Quick Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${audioEnabled ? 'bg-white text-black hover:bg-slate-200' : 'bg-red-500 text-white hover:bg-red-600'} shadow-lg`}
                title={audioEnabled ? "Mute" : "Unmute"}
              >
                {audioEnabled ? <FaMicrophone size={14} /> : <FaMicrophoneSlash size={14} />}
              </button>
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${videoEnabled ? 'bg-white text-black hover:bg-slate-200' : 'bg-red-500 text-white hover:bg-red-600'} shadow-lg`}
                title={videoEnabled ? "Stop Video" : "Start Video"}
              >
                {videoEnabled ? <FaVideo size={14} /> : <FaVideoSlash size={14} />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all shadow-lg"
                title="Settings"
              >
                <FaCog size={14} />
              </button>
            </div>
          </div>

          {/* Collapsible Settings */}
          {showSettings && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 animate-slide-in-down space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 block">Microphone</label>
                <select className="w-full bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
                  value={selectedAudio} onChange={e => setSelectedAudio(e.target.value)}>
                  {audioDevices.map((d, i) => <option key={i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1 block">Camera</label>
                <select className="w-full bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
                  value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}>
                  {cameraDevices.map((d, i) => <option key={i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onJoin({ audioEnabled, videoEnabled, audioDeviceId: selectedAudio, videoDeviceId: selectedCamera })}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Join Meeting <span className="text-lg">→</span>
            </button>
            <button onClick={() => window.history.back()} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 font-medium py-2">
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= DEVICE SETTINGS MODAL =============
function DeviceSettingsModal({ isOpen, onClose, cameraDevices, audioDevices, selectedCamera, selectedAudio, onCameraChange, onAudioChange }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Device Settings</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"><FaTimes /></button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Camera</label>
            <select className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-colors" value={selectedCamera} onChange={e => onCameraChange(e.target.value)}>
              {cameraDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Microphone</label>
            <select className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-colors" value={selectedAudio} onChange={e => onAudioChange(e.target.value)}>
              {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-8">
          <button onClick={onClose} className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 shadow-md">Done</button>
        </div>
      </div>
    </div>
  )
}
