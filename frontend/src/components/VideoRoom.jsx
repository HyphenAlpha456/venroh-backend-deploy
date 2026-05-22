import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(SERVER_URL, { transports: ['websocket'], autoConnect: false });

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const VideoPlayer = React.memo(({ stream, isLocal, isMuted, isHandRaised, label }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex flex-col bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl aspect-video transition-all duration-300 hover:border-gray-600">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
      />
      
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white shadow-sm border border-white/10">
          {label}
        </div>
      </div>

      {isHandRaised && (
        <div className="absolute top-4 right-4 bg-yellow-500/90 backdrop-blur-sm text-white rounded-full p-2.5 shadow-lg animate-bounce border border-yellow-400/50">
          ✋
        </div>
      )}
    </div>
  );
});

const VideoRoom = ({ roomId }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set());

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const initRef = useRef(false);

  const cleanupPeer = useCallback((id) => {
    if (peersRef.current[id]) {
      peersRef.current[id].close();
      delete peersRef.current[id];
    }
    setRemoteStreams(prev => prev.filter(stream => stream.id !== id));
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initRoom = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        socket.connect();
        socket.emit('join-room', { roomId });
      } catch (err) {
        console.error("Hardware access denied:", err);
      }
    };

    initRoom();

    const createPeer = (targetId, stream) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);
      
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, targetId });
      };

      peer.ontrack = (e) => {
        setRemoteStreams(prev => {
          if (prev.some(p => p.id === targetId)) return prev;
          return [...prev, { id: targetId, stream: e.streams[0] }];
        });
      };

      return peer;
    };

    socket.on('user-connected', async (newUserId) => {
      const peer = createPeer(newUserId, localStreamRef.current);
      peersRef.current[newUserId] = peer;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit('webrtc-offer', { offer, targetId: newUserId });
    });

    socket.on('webrtc-offer', async ({ offer, callerId }) => {
      const peer = createPeer(callerId, localStreamRef.current);
      peersRef.current[callerId] = peer;
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('webrtc-answer', { answer, targetId: callerId });
    });

    socket.on('webrtc-answer', async ({ answer, callerId }) => {
      if (peersRef.current[callerId]) {
        await peersRef.current[callerId].setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate, callerId }) => {
      if (peersRef.current[callerId]) {
        await peersRef.current[callerId].addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('user-raised-hand', (userId) => {
      setRaisedHands(prev => new Set(prev).add(userId));
      setTimeout(() => {
        setRaisedHands(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 5000);
    });

    socket.on('user-disconnected', cleanupPeer);

    return () => {
      socket.disconnect();
      socket.off('user-connected');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('ice-candidate');
      socket.off('user-raised-hand');
      socket.off('user-disconnected');
      
      Object.keys(peersRef.current).forEach(cleanupPeer);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, cleanupPeer]);

  const toggleMic = () => {
    const track = localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
    }
  };

  const toggleVideo = () => {
    const track = localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoOn(track.enabled);
    }
  };

  const stopScreenShare = () => {
    const videoTrack = localStream.getVideoTracks()[0];
    Object.values(peersRef.current).forEach(peer => {
      const sender = peer.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) return stopScreenShare();
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      
      setIsScreenSharing(true);
      screenTrack.onended = stopScreenShare;
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const raiseHand = () => {
    socket.emit('raise-hand');
    setRaisedHands(prev => new Set(prev).add('local'));
    setTimeout(() => {
      setRaisedHands(prev => {
        const next = new Set(prev);
        next.delete('local');
        return next;
      });
    }, 5000);
  };

  const totalParticipants = remoteStreams.length + 1;
  const gridClass = totalParticipants === 1 ? 'grid-cols-1 max-w-4xl' 
                  : totalParticipants === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-6xl'
                  : totalParticipants <= 4 ? 'grid-cols-2 max-w-6xl'
                  : 'grid-cols-2 md:grid-cols-3 max-w-7xl';

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-gray-100 font-sans selection:bg-blue-500/30">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 bg-[#0B0F19]/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            VenRoh Pitch
          </h1>
          <div className="h-4 w-px bg-gray-700" />
          <span className="font-mono text-xs font-medium text-gray-400 bg-gray-800/50 px-2.5 py-1 rounded-md border border-gray-700/50">
            {roomId}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div className={`w-full grid gap-4 ${gridClass} transition-all duration-500 ease-in-out`}>
          <VideoPlayer 
            stream={localStream} 
            isLocal={!isScreenSharing} 
            isMuted={!isMicOn}
            isHandRaised={raisedHands.has('local')}
            label={`You ${!isMicOn ? '(Muted)' : ''}`} 
          />
          
          {remoteStreams.map(remote => (
            <VideoPlayer 
              key={remote.id} 
              stream={remote.stream} 
              isLocal={false}
              isHandRaised={raisedHands.has(remote.id)}
              label={`Participant ${remote.id.substring(0, 4)}`} 
            />
          ))}
        </div>
      </main>

      <footer className="flex items-center justify-center p-6 pb-8 bg-gradient-to-t from-black/40 to-transparent">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/80 backdrop-blur-2xl border border-gray-700/50 rounded-2xl shadow-2xl">
          <ControlButton 
            isActive={isMicOn} 
            onClick={toggleMic} 
            activeIcon="🎙️" inactiveIcon="🔇" activeColor="bg-gray-700 hover:bg-gray-600" inactiveColor="bg-red-500/90 hover:bg-red-500" 
          />
          <ControlButton 
            isActive={isVideoOn} 
            onClick={toggleVideo} 
            activeIcon="📷" inactiveIcon="🚫" activeColor="bg-gray-700 hover:bg-gray-600" inactiveColor="bg-red-500/90 hover:bg-red-500" 
          />
          <div className="w-px h-8 bg-gray-700/50 mx-1" />
          <ControlButton 
            isActive={!isScreenSharing} 
            onClick={toggleScreenShare} 
            activeIcon="💻" inactiveIcon="🛑" activeColor="bg-gray-700 hover:bg-gray-600" inactiveColor="bg-blue-600 hover:bg-blue-500 text-white" 
            label={isScreenSharing ? "Stop" : "Present"}
          />
          <ControlButton 
            isActive={true} 
            onClick={raiseHand} 
            activeIcon="✋" inactiveIcon="✋" activeColor="bg-gray-700 hover:bg-gray-600" 
            label="Hand"
          />
        </div>
      </footer>
    </div>
  );
};

const ControlButton = ({ isActive, onClick, activeIcon, inactiveIcon, activeColor, inactiveColor, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center gap-2 h-12 ${label ? 'px-5' : 'w-12'} rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm ${isActive ? activeColor : inactiveColor}`}
  >
    <span className="text-lg">{isActive ? activeIcon : inactiveIcon}</span>
    {label && <span className="font-semibold text-sm tracking-wide">{label}</span>}
  </button>
);

export default VideoRoom;