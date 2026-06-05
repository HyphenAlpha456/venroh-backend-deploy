import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PhoneOff } from 'lucide-react';

import { getSocket } from '../../services/socketService';
import { getTurnCredentials } from '../../services/meetingService';

const VideoPlayer = React.memo(
  ({ stream, isLocal, isMuted, isHandRaised, label }) => {
    const videoRef = useRef(null);

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <div className="relative flex aspect-video flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl transition-all duration-300 hover:border-gray-600">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          className={`h-full w-full object-cover ${
            isLocal ? 'scale-x-[-1]' : ''
          }`}
        />

        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-sm font-medium text-white shadow-sm backdrop-blur-md">
            {label}
          </div>
        </div>

        {isHandRaised && (
          <div className="absolute right-4 top-4 animate-bounce rounded-full border border-yellow-400/50 bg-yellow-500/90 p-2.5 text-white shadow-lg backdrop-blur-sm">
            ✋
          </div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

const MeetingRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Preparing secure pitch room...');

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const initRef = useRef(false);

  const iceServersRef = useRef({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });

  const cleanupPeer = useCallback((id) => {
    if (peersRef.current[id]) {
      peersRef.current[id].close();
      delete peersRef.current[id];
    }

    setRemoteStreams((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const createPeer = useCallback(
    (targetId, stream) => {
      const socket = getSocket();

      const peer = new RTCPeerConnection(iceServersRef.current);

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            targetId
          });
        }
      };

      peer.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const alreadyExists = prev.some((item) => item.id === targetId);

          if (alreadyExists) return prev;

          return [
            ...prev,
            {
              id: targetId,
              stream: event.streams[0]
            }
          ];
        });
      };

      return peer;
    },
    []
  );

  useEffect(() => {
    if (initRef.current) return;

    initRef.current = true;

    const socket = getSocket();

    if (!socket) {
      setError('Socket connection failed. Please login again.');
      return;
    }

    const initRoom = async () => {
      try {
        setStatus('Fetching secure TURN credentials...');

        try {
          const data = await getTurnCredentials();

          if (data.success && data.iceServers) {
            iceServersRef.current = {
              iceServers: data.iceServers
            };
          }
        } catch {
          console.warn('TURN credentials unavailable. Using public STUN.');
        }

        setStatus('Requesting camera and microphone permission...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        setLocalStream(stream);
        localStreamRef.current = stream;

        socket.emit('join-room', { roomId });

        setStatus('Waiting for another participant...');
      } catch (err) {
        setError(
          err.message ||
            'Unable to start meeting. Please allow camera and microphone.'
        );
      }
    };

    initRoom();

    socket.on('user-connected', async (newUserId) => {
      try {
        if (!localStreamRef.current) return;

        setStatus('Participant connected. Creating secure connection...');

        const peer = createPeer(newUserId, localStreamRef.current);
        peersRef.current[newUserId] = peer;

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit('webrtc-offer', {
          offer,
          targetId: newUserId
        });
      } catch {
        setError('Failed to create WebRTC offer');
      }
    });

    socket.on('webrtc-offer', async ({ offer, callerId }) => {
      try {
        if (!localStreamRef.current) return;

        setStatus('Incoming participant. Connecting...');

        const peer = createPeer(callerId, localStreamRef.current);
        peersRef.current[callerId] = peer;

        await peer.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit('webrtc-answer', {
          answer,
          targetId: callerId
        });

        setStatus('Connected');
      } catch {
        setError('Failed to answer WebRTC offer');
      }
    });

    socket.on('webrtc-answer', async ({ answer, callerId }) => {
      try {
        const peer = peersRef.current[callerId];

        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
          setStatus('Connected');
        }
      } catch {
        setError('Failed to process WebRTC answer');
      }
    });

    socket.on('ice-candidate', async ({ candidate, callerId }) => {
      try {
        const peer = peersRef.current[callerId];

        if (peer && candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch {
        console.warn('Failed to add ICE candidate');
      }
    });

    socket.on('user-raised-hand', (userId) => {
      setRaisedHands((prev) => new Set(prev).add(userId));

      setTimeout(() => {
        setRaisedHands((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 5000);
    });

    socket.on('user-disconnected', cleanupPeer);

    return () => {
      socket.off('user-connected');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('ice-candidate');
      socket.off('user-raised-hand');
      socket.off('user-disconnected');

      Object.keys(peersRef.current).forEach(cleanupPeer);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, createPeer, cleanupPeer]);

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
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (!videoTrack) return;

    Object.values(peersRef.current).forEach((peer) => {
      const sender = peer
        .getSenders()
        .find((item) => item.track?.kind === 'video');

      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });

    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peersRef.current).forEach((peer) => {
        const sender = peer
          .getSenders()
          .find((item) => item.track?.kind === 'video');

        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      setIsScreenSharing(true);

      screenTrack.onended = stopScreenShare;
    } catch {
      setError('Screen sharing failed');
    }
  };

  const raiseHand = () => {
    const socket = getSocket();

    socket?.emit('raise-hand', { roomId });

    setRaisedHands((prev) => new Set(prev).add('local'));

    setTimeout(() => {
      setRaisedHands((prev) => {
        const next = new Set(prev);
        next.delete('local');
        return next;
      });
    }, 5000);
  };

  const leaveMeeting = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    Object.keys(peersRef.current).forEach(cleanupPeer);

    navigate('/meetings');
  };

  const totalParticipants = remoteStreams.length + 1;

  const gridClass =
    totalParticipants === 1
      ? 'grid-cols-1 max-w-4xl'
      : totalParticipants === 2
        ? 'grid-cols-1 md:grid-cols-2 max-w-6xl'
        : totalParticipants <= 4
          ? 'grid-cols-2 max-w-6xl'
          : 'grid-cols-2 md:grid-cols-3 max-w-7xl';

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F19] font-sans text-gray-100 selection:bg-blue-500/30">
      <header className="z-10 flex items-center justify-between border-b border-gray-800/60 bg-[#0B0F19]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/meetings')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700/70 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <h1 className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            VenRoh Pitch
          </h1>

          <div className="h-4 w-px bg-gray-700" />

          <span className="rounded-md border border-gray-700/50 bg-gray-800/50 px-2.5 py-1 font-mono text-xs font-medium text-gray-400">
            {roomId}
          </span>
        </div>

        <button
          onClick={leaveMeeting}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <PhoneOff size={17} />
          Leave
        </button>
      </header>

      {error && (
        <div className="mx-auto mt-4 w-full max-w-4xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mx-auto mt-4 w-full max-w-4xl rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3 text-center text-sm text-gray-300">
        {status}
      </div>

      <main className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <div
          className={`grid w-full gap-4 ${gridClass} transition-all duration-500 ease-in-out`}
        >
          <VideoPlayer
            stream={localStream}
            isLocal={!isScreenSharing}
            isMuted={!isMicOn}
            isHandRaised={raisedHands.has('local')}
            label={`You ${!isMicOn ? '(Muted)' : ''}`}
          />

          {remoteStreams.map((remote) => (
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

      <footer className="flex items-center justify-center bg-gradient-to-t from-black/40 to-transparent p-6 pb-8">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-700/50 bg-gray-800/80 px-4 py-3 shadow-2xl backdrop-blur-2xl">
          <ControlButton
            isActive={isMicOn}
            onClick={toggleMic}
            activeIcon="🎙️"
            inactiveIcon="🔇"
            activeColor="bg-gray-700 hover:bg-gray-600"
            inactiveColor="bg-red-500/90 hover:bg-red-500"
          />

          <ControlButton
            isActive={isVideoOn}
            onClick={toggleVideo}
            activeIcon="📷"
            inactiveIcon="🚫"
            activeColor="bg-gray-700 hover:bg-gray-600"
            inactiveColor="bg-red-500/90 hover:bg-red-500"
          />

          <div className="mx-1 h-8 w-px bg-gray-700/50" />

          <ControlButton
            isActive={!isScreenSharing}
            onClick={toggleScreenShare}
            activeIcon="💻"
            inactiveIcon="🛑"
            activeColor="bg-gray-700 hover:bg-gray-600"
            inactiveColor="bg-blue-600 hover:bg-blue-500 text-white"
            label={isScreenSharing ? 'Stop' : 'Present'}
          />

          <ControlButton
            isActive={true}
            onClick={raiseHand}
            activeIcon="✋"
            inactiveIcon="✋"
            activeColor="bg-gray-700 hover:bg-gray-600"
            label="Hand"
          />
        </div>
      </footer>
    </div>
  );
};

const ControlButton = ({
  isActive,
  onClick,
  activeIcon,
  inactiveIcon,
  activeColor,
  inactiveColor,
  label
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
        label ? 'px-5' : 'w-12'
      } ${isActive ? activeColor : inactiveColor}`}
    >
      <span className="text-lg">{isActive ? activeIcon : inactiveIcon}</span>

      {label && (
        <span className="text-sm font-semibold tracking-wide">{label}</span>
      )}
    </button>
  );
};

export default MeetingRoomPage;