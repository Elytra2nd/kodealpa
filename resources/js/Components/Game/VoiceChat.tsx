import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Users, Wifi, WifiOff, AlertCircle } from 'lucide-react';

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

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function VoiceChat({ sessionId, userId, nickname, role, participants }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [voiceParticipants, setVoiceParticipants] = useState<Map<number, VoiceParticipant>>(new Map());
  const [error, setError] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(console.error);
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  const setupAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateAudioLevel = () => {
        if (!analyserRef.current || !isConnected) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const level = Math.min(Math.round((average / 255) * 100), 100);

        setAudioLevel(level);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio monitoring:', err);
    }
  }, [isConnected]);

  const connectSignalingServer = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const connectedParticipants = new Map(
          participants
            .filter(p => p.user_id !== userId)
            .map(p => [
              p.user_id,
              {
                userId: p.user_id,
                nickname: p.nickname,
                role: p.role,
                isSpeaking: false,
                audioLevel: 0,
                isConnected: Math.random() > 0.3
              }
            ])
        );
        setVoiceParticipants(connectedParticipants);
        resolve();
      }, 1000);
    });
  }, [participants, userId]);

  const connectVoiceChat = async () => {
    try {
      setConnectionStatus('connecting');
      setError('');
      setIsAnimating(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      localStreamRef.current = stream;
      setupAudioLevelMonitoring(stream);
      await connectSignalingServer();

      setIsConnected(true);
      setConnectionStatus('connected');
      setIsAnimating(false);
    } catch (err: any) {
      console.error('Error connecting to voice chat:', err);
      let errorMessage = 'Gagal terhubung ke obrolan suara';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Izin mikrofon ditolak. Silakan izinkan akses mikrofon di pengaturan browser Anda.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Mikrofon tidak ditemukan. Pastikan perangkat audio Anda terpasang dengan benar.';
      }

      setError(errorMessage);
      setConnectionStatus('error');
      setIsAnimating(false);
      cleanup();
    }
  };

  const disconnectVoiceChat = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setVoiceParticipants(new Map());
    setAudioLevel(0);
    setError('');
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;

      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });

      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerMuted(prev => !prev);
  }, []);

  const getStatusConfig = () => {
    const configs = {
      connected: {
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: Wifi,
        text: 'Terhubung'
      },
      connecting: {
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        icon: Wifi,
        text: 'Menghubungkan...'
      },
      error: {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: WifiOff,
        text: 'Error'
      },
      disconnected: {
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: WifiOff,
        text: 'Terputus'
      }
    };
    return configs[connectionStatus];
  };

  const getRoleBadgeColor = (userRole: string) => {
    const colors = {
      defuser: 'bg-blue-100 text-blue-700',
      expert: 'bg-purple-100 text-purple-700',
      host: 'bg-orange-100 text-orange-700'
    };
    return colors[userRole as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getRoleText = (userRole: string) => {
    const roles = {
      defuser: 'Penjinakan',
      expert: 'Ahli',
      host: 'Tuan Rumah'
    };
    return roles[userRole as keyof typeof roles] || userRole;
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Obrolan Suara</h3>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor} backdrop-blur-sm transition-all duration-300`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.color} ${isAnimating ? 'animate-pulse' : ''}`} />
            <span className={`text-xs sm:text-sm font-semibold ${statusConfig.color}`}>
              {statusConfig.text}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-[slideDown_0.3s_ease-out]">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
          {!isConnected ? (
            <button
              onClick={connectVoiceChat}
              disabled={connectionStatus === 'connecting'}
              className="flex-1 sm:flex-initial flex items-center justify-center px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {connectionStatus === 'connecting' ? 'Menghubungkan...' : 'Bergabung'}
            </button>
          ) : (
            <>
              <button
                onClick={disconnectVoiceChat}
                className="flex items-center justify-center px-4 sm:px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Keluar</span>
              </button>

              <button
                onClick={toggleMute}
                className={`flex items-center justify-center px-4 sm:px-5 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base ${
                  isMuted
                    ? 'bg-gradient-to-r from-red-400 to-red-500 text-white hover:from-red-500 hover:to-red-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                <span className="hidden sm:inline ml-2">{isMuted ? 'Bisu' : 'Aktif'}</span>
              </button>

              <button
                onClick={toggleSpeaker}
                className={`flex items-center justify-center px-4 sm:px-5 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base ${
                  isSpeakerMuted
                    ? 'bg-gradient-to-r from-red-400 to-red-500 text-white hover:from-red-500 hover:to-red-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                }`}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                <span className="hidden sm:inline ml-2">Speaker</span>
              </button>
            </>
          )}
        </div>

        {/* Local Audio Level */}
        {isConnected && (
          <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isMuted ? 'bg-red-400' : 'bg-green-400'} animate-pulse`} />
                <span className="text-sm sm:text-base font-bold text-blue-900">
                  {nickname} <span className="text-blue-600 font-normal">(Anda)</span>
                </span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getRoleBadgeColor(role)}`}>
                {getRoleText(role)}
              </span>
            </div>

            <div className="relative w-full bg-blue-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-150 ${
                  audioLevel > 30 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-blue-300'
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs sm:text-sm font-semibold ${isMuted ? 'text-red-600' : 'text-green-600'}`}>
                {isMuted ? '🔇 Mikrofon Mati' : '🎤 Mikrofon Aktif'}
              </span>
              <span className="text-xs sm:text-sm text-blue-700 font-medium">
                Volume: {audioLevel}%
              </span>
            </div>
          </div>
        )}

        {/* Voice Participants */}
        {isConnected && voiceParticipants.size > 0 && (
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            <h4 className="text-sm sm:text-base font-bold text-gray-800 flex items-center">
              <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-2" />
              Peserta Lain ({voiceParticipants.size})
            </h4>

            <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {Array.from(voiceParticipants.values()).map(participant => (
                <div
                  key={participant.userId}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
                    participant.isConnected
                      ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm hover:shadow-md'
                      : 'border-gray-300 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        participant.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm sm:text-base font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-none">
                        {participant.nickname}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getRoleBadgeColor(participant.role)}`}>
                      {getRoleText(participant.role)}
                    </span>
                  </div>

                  {participant.isConnected && (
                    <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        className={`h-2 rounded-full transition-all duration-200 ${
                          participant.isSpeaking
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gray-300'
                        }`}
                        style={{ width: `${participant.audioLevel}%` }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs font-medium ${
                      participant.isConnected ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {participant.isConnected ? '✓ Terhubung' : '✗ Terputus'}
                    </span>
                    {participant.isConnected && (
                      <span className="text-xs text-gray-600 font-medium">
                        {participant.isSpeaking ? '🗣️ Berbicara' : '🤫 Diam'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Chat Tips */}
        {isConnected && (
          <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl shadow-sm animate-[fadeIn_0.3s_ease-out]">
            <h5 className="text-sm sm:text-base font-bold text-purple-900 mb-3 flex items-center">
              💡 Tips Obrolan Suara
            </h5>
            <ul className="text-xs sm:text-sm text-purple-800 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Gunakan komunikasi yang jelas dan ringkas</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{role === 'defuser' ? 'Jelaskan apa yang Anda lihat dengan akurat' : 'Berikan instruksi yang jelas'}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Matikan mikrofon saat tidak berbicara untuk mengurangi kebisingan</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Berbicara satu per satu untuk menghindari kebingungan</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
