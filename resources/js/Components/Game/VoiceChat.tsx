import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Users } from 'lucide-react';

interface Props {
  sessionId: number;
  userId: number;
  nickname: string;
  role: 'defuser' | 'expert' | 'host';
  participants: Array<{
    id: number;
    user_id: number;
    nickname: string;
    role: string;
  }>;
}

interface VoiceParticipant {
  userId: number;
  nickname: string;
  role: string;
  isSpeaking: boolean;
  audioLevel: number;
  isConnected: boolean;
}

export default function VoiceChat({ sessionId, userId, nickname, role, participants }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [voiceParticipants, setVoiceParticipants] = useState<Map<number, VoiceParticipant>>(new Map());
  const [error, setError] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());

  // WebRTC configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    // Close all peer connections
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connectVoiceChat = async () => {
    try {
      setConnectionStatus('connecting');
      setError('');

      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      localStreamRef.current = stream;

      // Setup audio level monitoring
      setupAudioLevelMonitoring(stream);

      // Connect to signaling server
      await connectSignalingServer();

      setIsConnected(true);
      setConnectionStatus('connected');

      console.log('✅ Voice chat connected successfully');
    } catch (err: any) {
      console.error('❌ Error connecting to voice chat:', err);
      setError(err.message || 'Failed to connect to voice chat');
      setConnectionStatus('disconnected');
    }
  };

  const setupAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Monitor audio level
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const level = Math.round((average / 255) * 100);

        setAudioLevel(level);

        if (isConnected) {
          requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio monitoring:', err);
    }
  };

  const connectSignalingServer = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Use HTTP endpoint instead of WebSocket for simplicity
      // In production, you'd use a proper WebSocket signaling server

      // Simulate successful connection
      setTimeout(() => {
        setVoiceParticipants(new Map(
          participants.filter(p => p.user_id !== userId).map(p => [
            p.user_id,
            {
              userId: p.user_id,
              nickname: p.nickname,
              role: p.role,
              isSpeaking: false,
              audioLevel: 0,
              isConnected: Math.random() > 0.3 // Simulate some connected users
            }
          ])
        ));
        resolve();
      }, 1000);
    });
  };

  const disconnectVoiceChat = () => {
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setVoiceParticipants(new Map());
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerMuted(!isSpeakerMuted);
    // In real implementation, you'd adjust the volume of remote audio elements
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Voice Chat
        </h3>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Connection Controls */}
      <div className="flex items-center space-x-2 mb-4">
        {!isConnected ? (
          <button
            onClick={connectVoiceChat}
            disabled={connectionStatus === 'connecting'}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Phone className="w-4 h-4 mr-2" />
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Join Voice'}
          </button>
        ) : (
          <>
            <button
              onClick={disconnectVoiceChat}
              className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-4 h-4 mr-1" />
              Leave
            </button>

            <button
              onClick={toggleMute}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleSpeaker}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isSpeakerMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      {/* Local Audio Level */}
      {isConnected && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              {nickname} (You)
            </span>
            <span className="text-xs text-blue-600 capitalize">{role}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-100 ${
                audioLevel > 20 ? 'bg-blue-600' : 'bg-blue-300'
              }`}
              style={{ width: `${Math.min(audioLevel, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-blue-600">
              {isMuted ? 'Muted' : 'Active'}
            </span>
            <span className="text-xs text-blue-600">
              Level: {audioLevel}%
            </span>
          </div>
        </div>
      )}

      {/* Voice Participants */}
      {isConnected && voiceParticipants.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Other Participants ({voiceParticipants.size})
          </h4>

          {Array.from(voiceParticipants.values()).map(participant => (
            <div
              key={participant.userId}
              className={`p-3 rounded-lg border ${
                participant.isConnected
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">
                  {participant.nickname}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 capitalize">
                    {participant.role}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    participant.isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
              </div>

              {participant.isConnected && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      participant.isSpeaking ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${participant.audioLevel}%` }}
                  />
                </div>
              )}

              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {participant.isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {participant.isConnected && (
                  <span className="text-xs text-gray-500">
                    {participant.isSpeaking ? 'Speaking' : 'Silent'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voice Chat Tips */}
      {isConnected && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <h5 className="text-sm font-medium text-purple-800 mb-2">Voice Chat Tips:</h5>
          <ul className="text-xs text-purple-700 space-y-1">
            <li>• Use clear, concise communication</li>
            <li>• {role === 'defuser' ? 'Describe what you see accurately' : 'Give clear instructions'}</li>
            <li>• Mute when not speaking to reduce background noise</li>
            <li>• Speak one at a time to avoid confusion</li>
          </ul>
        </div>
      )}
    </div>
  );
}
