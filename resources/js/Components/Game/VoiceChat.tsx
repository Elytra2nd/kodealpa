import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Users, Wifi, WifiOff, AlertCircle, Skull } from 'lucide-react';
import { gsap } from 'gsap';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const CONFIG = {
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  },
  FFT_SIZE: 256,
  SMOOTHING_TIME_CONSTANT: 0.8,
  AUDIO_UPDATE_INTERVAL: 150,
  CONNECTION_TIMEOUT: 1000,
  MAX_PARTICIPANTS_DISPLAY: 10,
  PULSE_DURATION: 2000,
} as const;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
} as const;

const STATUS_CONFIG = {
  connected: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-600',
    icon: Wifi,
    text: 'Terhubung ke Altar Suara',
  },
  connecting: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-600',
    icon: Wifi,
    text: 'Memanggil Roh Komunikasi...',
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-600',
    icon: WifiOff,
    text: 'Ritual Gagal',
  },
  disconnected: {
    color: 'text-stone-600',
    bgColor: 'bg-stone-900/30',
    borderColor: 'border-stone-600',
    icon: WifiOff,
    text: 'Altar Sunyi',
  },
} as const;

const ROLE_CONFIG = {
  defuser: {
    text: 'Penjinakkan Bom',
    icon: '💣',
    color: 'bg-red-900/40 text-red-300 border-red-700',
  },
  expert: {
    text: 'Ahli Grimoire',
    icon: '📖',
    color: 'bg-blue-900/40 text-blue-300 border-blue-700',
  },
  host: {
    text: 'Guild Master',
    icon: '👑',
    color: 'bg-amber-900/40 text-amber-300 border-amber-700',
  },
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================
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

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const skullRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Torch flicker animation
    const torchInterval = setInterval(() => {
      torchRefs.current.forEach((torch) => {
        if (torch) {
          gsap.to(torch, {
            opacity: Math.random() * 0.3 + 0.7,
            scale: Math.random() * 0.1 + 0.95,
            duration: 0.15,
            ease: 'power1.inOut',
          });
        }
      });
    }, 150);

    // Skull float animation
    if (skullRef.current) {
      gsap.to(skullRef.current, {
        y: -6,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    return () => clearInterval(torchInterval);
  }, []);

  const setTorchRef = (index: number) => (el: HTMLSpanElement | null) => {
    torchRefs.current[index] = el;
  };

  return { setTorchRef, skullRef };
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const ParticipantCard = memo(({
  participant,
  roleConfig,
}: {
  participant: VoiceParticipant;
  roleConfig: typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG];
}) => {
  return (
    <div
      className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 dungeon-card ${
        participant.isConnected
          ? 'border-emerald-700 bg-gradient-to-br from-emerald-950/40 to-stone-900 shadow-sm hover:shadow-md dungeon-card-glow-green'
          : 'border-stone-700 bg-stone-950/40 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              participant.isConnected ? 'bg-emerald-500 dungeon-pulse' : 'bg-stone-500'
            }`}
          />
          <span className="text-sm sm:text-base font-semibold text-stone-200 truncate max-w-[120px] sm:max-w-none">
            {participant.nickname}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${roleConfig.color}`}>
          {roleConfig.icon} {roleConfig.text}
        </span>
      </div>

      {participant.isConnected && (
        <div className="relative w-full bg-stone-800 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className={`h-2 rounded-full transition-all duration-200 ${
              participant.isSpeaking
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 dungeon-glow'
                : 'bg-stone-700'
            }`}
            style={{ width: `${participant.audioLevel}%` }}
          />
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <span
          className={`text-xs font-medium ${
            participant.isConnected ? 'text-emerald-400' : 'text-stone-500'
          }`}
        >
          {participant.isConnected ? '✓ Terhubung' : '✗ Terputus'}
        </span>
        {participant.isConnected && (
          <span className="text-xs text-stone-400 font-medium">
            {participant.isSpeaking ? '🗣️ Berbicara' : '🤫 Diam'}
          </span>
        )}
      </div>
    </div>
  );
});

ParticipantCard.displayName = 'ParticipantCard';

// ============================================
// MAIN COMPONENT
// ============================================
export default function VoiceChat({ sessionId, userId, nickname, role, participants }: Props) {
  const { setTorchRef, skullRef } = useDungeonAtmosphere();

  // State Management
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [voiceParticipants, setVoiceParticipants] = useState<Map<number, VoiceParticipant>>(new Map());
  const [error, setError] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
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

  // Setup audio level monitoring
  const setupAudioLevelMonitoring = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        const source = audioContextRef.current.createMediaStreamSource(stream);

        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = CONFIG.FFT_SIZE;
        analyserRef.current.smoothingTimeConstant = CONFIG.SMOOTHING_TIME_CONSTANT;
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
    },
    [isConnected]
  );

  // Connect to signaling server (mock implementation)
  const connectSignalingServer = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const connectedParticipants = new Map(
          participants
            .filter((p) => p.user_id !== userId)
            .map((p) => [
              p.user_id,
              {
                userId: p.user_id,
                nickname: p.nickname,
                role: p.role,
                isSpeaking: false,
                audioLevel: 0,
                isConnected: Math.random() > 0.3,
              },
            ])
        );
        setVoiceParticipants(connectedParticipants);
        resolve();
      }, CONFIG.CONNECTION_TIMEOUT);
    });
  }, [participants, userId]);

  // Connect voice chat
  const connectVoiceChat = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: CONFIG.AUDIO_CONSTRAINTS,
      });

      localStreamRef.current = stream;
      setupAudioLevelMonitoring(stream);
      await connectSignalingServer();

      setIsConnected(true);
      setConnectionStatus('connected');
    } catch (err: any) {
      console.error('Error connecting to voice chat:', err);
      let errorMessage = 'Gagal terhubung ke altar suara dungeon';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage =
          'Izin mikrofon ditolak oleh penjaga portal. Silakan izinkan akses mikrofon di pengaturan browser Anda.';
      } else if (err.name === 'NotFoundError') {
        errorMessage =
          'Kristal suara tidak ditemukan. Pastikan perangkat audio Anda terpasang dengan benar di altar.';
      }

      setError(errorMessage);
      setConnectionStatus('error');
      cleanup();
    }
  }, [cleanup, setupAudioLevelMonitoring, connectSignalingServer]);

  // Disconnect voice chat
  const disconnectVoiceChat = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setVoiceParticipants(new Map());
    setAudioLevel(0);
    setError('');
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;

      audioTracks.forEach((track) => {
        track.enabled = !newMutedState;
      });

      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerMuted((prev) => !prev);
  }, []);

  // Get status config
  const statusConfig = STATUS_CONFIG[connectionStatus];
  const StatusIcon = statusConfig.icon;
  const roleConfig = ROLE_CONFIG[role];

  return (
    <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 border-2 border-amber-700/60 rounded-2xl shadow-2xl overflow-hidden dungeon-card-glow">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/80 via-stone-900 to-amber-900/80 p-4 sm:p-5 relative overflow-hidden border-b-2 border-amber-700/40">
        <div className="absolute top-2 left-2 text-xl sm:text-2xl">
          <span ref={setTorchRef(0)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>
        <div className="absolute top-2 right-2 text-xl sm:text-2xl">
          <span ref={setTorchRef(1)} className="dungeon-torch-flicker">
            🔥
          </span>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-600/30 backdrop-blur-sm rounded-full p-2 border border-amber-600/40">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-amber-300 dungeon-glow-text">
              Altar Suara Dungeon
            </h3>
          </div>
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor} backdrop-blur-sm transition-all duration-300 border ${statusConfig.borderColor}`}
          >
            <StatusIcon
              className={`w-4 h-4 ${statusConfig.color} ${
                connectionStatus === 'connecting' ? 'dungeon-pulse' : ''
              }`}
            />
            <span className={`text-xs sm:text-sm font-semibold ${statusConfig.color}`}>
              {statusConfig.text}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-950/60 border-l-4 border-red-600 rounded-lg animate-[slideDown_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-red">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
          {!isConnected ? (
            <button
              onClick={connectVoiceChat}
              disabled={connectionStatus === 'connecting'}
              className="flex-1 sm:flex-initial flex items-center justify-center px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl hover:from-emerald-700 hover:to-green-800 disabled:from-stone-700 disabled:to-stone-800 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base dungeon-button-glow border border-emerald-500/40"
              aria-label="Bergabung ke altar suara"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {connectionStatus === 'connecting' ? 'Memanggil Roh...' : 'Masuki Altar'}
            </button>
          ) : (
            <>
              <button
                onClick={disconnectVoiceChat}
                className="flex items-center justify-center px-4 sm:px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base border border-red-500/40"
                aria-label="Keluar dari altar suara"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Keluar Altar</span>
              </button>

              <button
                onClick={toggleMute}
                className={`flex items-center justify-center px-4 sm:px-5 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base ${
                  isMuted
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 border border-red-500/40'
                    : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border-2 border-stone-600'
                }`}
                aria-label={isMuted ? 'Aktifkan mikrofon' : 'Bisukan mikrofon'}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline ml-2">{isMuted ? 'Bisu' : 'Aktif'}</span>
              </button>

              <button
                onClick={toggleSpeaker}
                className={`flex items-center justify-center px-4 sm:px-5 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold text-sm sm:text-base ${
                  isSpeakerMuted
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 border border-red-500/40'
                    : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border-2 border-stone-600'
                }`}
                aria-label={isSpeakerMuted ? 'Aktifkan speaker' : 'Bisukan speaker'}
              >
                {isSpeakerMuted ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline ml-2">Speaker</span>
              </button>
            </>
          )}
        </div>

        {/* Local Audio Level */}
        {isConnected && (
          <div className="mb-4 p-4 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 rounded-xl border-2 border-blue-700/40 shadow-sm animate-[fadeIn_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-blue">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMuted ? 'bg-red-500' : 'bg-emerald-500'
                  } dungeon-pulse`}
                />
                <span className="text-sm sm:text-base font-bold text-blue-200">
                  {nickname}{' '}
                  <span className="text-blue-400 font-normal">(Anda di Altar)</span>
                </span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${roleConfig.color}`}>
                {roleConfig.icon} {roleConfig.text}
              </span>
            </div>

            <div className="relative w-full bg-stone-800 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-150 ${
                  audioLevel > 30
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 dungeon-glow'
                    : 'bg-blue-900'
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2">
              <span
                className={`text-xs sm:text-sm font-semibold ${
                  isMuted ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {isMuted ? '🔇 Kristal Suara Tertutup' : '🎤 Kristal Suara Aktif'}
              </span>
              <span className="text-xs sm:text-sm text-blue-300 font-medium">
                Resonansi: {audioLevel}%
              </span>
            </div>
          </div>
        )}

        {/* Voice Participants */}
        {isConnected && voiceParticipants.size > 0 && (
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            <h4 className="text-sm sm:text-base font-bold text-amber-300 flex items-center dungeon-glow-text">
              <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-red-600 rounded-full mr-2" />
              Petualang Lain di Altar ({voiceParticipants.size})
            </h4>

            <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-700 scrollbar-track-stone-900">
              {Array.from(voiceParticipants.values())
                .slice(0, CONFIG.MAX_PARTICIPANTS_DISPLAY)
                .map((participant) => {
                  const participantRoleConfig = ROLE_CONFIG[participant.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.host;
                  return (
                    <ParticipantCard
                      key={participant.userId}
                      participant={participant}
                      roleConfig={participantRoleConfig}
                    />
                  );
                })}
            </div>
          </div>
        )}

        {/* Voice Chat Tips */}
        {isConnected && (
          <div className="mt-4 p-4 bg-gradient-to-br from-purple-950/40 to-pink-950/40 border-2 border-purple-700/40 rounded-xl shadow-sm animate-[fadeIn_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-purple">
            <h5 className="text-sm sm:text-base font-bold text-purple-300 mb-3 flex items-center dungeon-glow-text">
              <span ref={skullRef} className="mr-2">
                💀
              </span>
              Mantra Komunikasi Altar
            </h5>
            <ul className="text-xs sm:text-sm text-purple-200 space-y-2">
              <li className="flex items-start">
                <span className="mr-2 text-purple-400">⚔️</span>
                <span>Gunakan kata-kata yang jelas dan ringkas seperti mantra kuno</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400">📖</span>
                <span>
                  {role === 'defuser'
                    ? 'Jelaskan apa yang Anda lihat dengan detail seperti membaca grimoire'
                    : 'Berikan instruksi yang jelas seperti melafalkan mantra'}
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400">🔇</span>
                <span>Tutup kristal suara saat tidak berbicara untuk mengurangi gema dungeon</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400">🗣️</span>
                <span>Berbicara satu per satu untuk menghindari gangguan energi mistis</span>
              </li>
            </ul>
          </div>
        )}

        {/* Disconnected State */}
        {!isConnected && connectionStatus === 'disconnected' && (
          <div className="p-6 text-center bg-gradient-to-br from-stone-950/40 to-stone-900/40 rounded-xl border-2 border-stone-700/40 backdrop-blur-sm">
            <div ref={skullRef} className="text-6xl mb-4 opacity-50">
              💀
            </div>
            <h5 className="text-lg font-bold text-stone-400 mb-2 dungeon-glow-text">
              Altar Sunyi Menunggu
            </h5>
            <p className="text-sm text-stone-500 leading-relaxed">
              Klik tombol "Masuki Altar" untuk memulai ritual komunikasi dengan petualang lain
            </p>
          </div>
        )}
      </div>

      {/* ========================================
          CUSTOM DUNGEON STYLES
          ======================================== */}
      <style>{`
        /* Torch Flicker */
        .dungeon-torch-flicker {
          display: inline-block;
        }

        /* Card Glows */
        .dungeon-card-glow {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2);
        }

        .dungeon-card-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
        }

        .dungeon-card-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2);
        }

        .dungeon-card-glow-purple {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2);
        }

        .dungeon-card-glow-red {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2);
        }

        /* Button Glow */
        .dungeon-button-glow:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3);
        }

        /* Text Glow */
        .dungeon-glow-text {
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4);
        }

        /* Pulse Animation */
        .dungeon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Glow Animation */
        .dungeon-glow {
          filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.6));
        }

        /* Scrollbar Styling */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb {
          background-color: rgba(180, 83, 9, 0.6);
          border-radius: 3px;
        }

        .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb:hover {
          background-color: rgba(180, 83, 9, 0.8);
        }

        /* Slide Down Animation */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Fade In Animation */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .dungeon-card-glow,
          .dungeon-card-glow-green,
          .dungeon-card-glow-blue,
          .dungeon-card-glow-purple,
          .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
