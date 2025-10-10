import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Users, Wifi, WifiOff, AlertCircle, Settings } from 'lucide-react';
import { gsap } from 'gsap';
import { toast } from 'sonner';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';

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
  CONNECTION_TIMEOUT: 1500,
  MAX_PARTICIPANTS_DISPLAY: 10,
  PULSE_DURATION: 2000,
  TEST_MODE: true, // Set to false in production
} as const;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun1.l.google.com:19302' },
    { urls: 'stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
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

interface TestLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

// ============================================
// CUSTOM HOOKS
// ============================================
const useDungeonAtmosphere = () => {
  const torchRefs = useRef<(HTMLElement | null)[]>([]);
  const skullRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
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

    if (skullRef.current) {
      gsap.to(skullRef.current, {
        y: -6,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const setTorchRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      torchRefs.current[index] = el;
    },
    []
  );

  return { setTorchRef, skullRef };
};

// ============================================
// MEMOIZED COMPONENTS
// ============================================
const ParticipantCard = memo(
  ({
    participant,
    roleConfig,
    isMobile,
  }: {
    participant: VoiceParticipant;
    roleConfig: typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG];
    isMobile: boolean;
  }) => {
    return (
      <div
        className={`p-3 rounded-xl border-2 transition-all duration-300 dungeon-card ${
          participant.isConnected
            ? 'border-emerald-700 bg-gradient-to-br from-emerald-950/40 to-stone-900 shadow-sm hover:shadow-md dungeon-card-glow-green'
            : 'border-stone-700 bg-stone-950/40 opacity-60'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${participant.isConnected ? 'bg-emerald-500 dungeon-pulse' : 'bg-stone-500'}`} />
            <span className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-stone-200 truncate`}>{participant.nickname}</span>
          </div>
          <Badge className={`${roleConfig.color} text-xs flex-shrink-0 ml-2`}>
            <span className="mr-1" aria-hidden="true">
              {roleConfig.icon}
            </span>
            <span className="hidden sm:inline">{roleConfig.text}</span>
          </Badge>
        </div>

        {participant.isConnected && (
          <div className="relative w-full bg-stone-800 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className={`h-2 rounded-full transition-all duration-200 ${
                participant.isSpeaking ? 'bg-gradient-to-r from-emerald-500 to-green-600 dungeon-glow' : 'bg-stone-700'
              }`}
              style={{ width: `${participant.audioLevel}%` }}
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <span className={`text-xs font-medium ${participant.isConnected ? 'text-emerald-400' : 'text-stone-500'}`}>
            {participant.isConnected ? '✓ Terhubung' : '✗ Terputus'}
          </span>
          {participant.isConnected && <span className="text-xs text-stone-400 font-medium">{participant.isSpeaking ? '🗣️ Berbicara' : '🤫 Diam'}</span>}
        </div>
      </div>
    );
  }
);

ParticipantCard.displayName = 'ParticipantCard';

const TestPanel = memo(
  ({
    logs,
    deviceInfo,
    onClearLogs,
    isMobile,
  }: {
    logs: TestLog[];
    deviceInfo: {
      hasMediaDevices: boolean;
      hasGetUserMedia: boolean;
      audioDevices: number;
      permissions: string;
    };
    onClearLogs: () => void;
    isMobile: boolean;
  }) => (
    <Card className="mt-4 border-2 border-cyan-600 bg-gradient-to-br from-cyan-950/40 to-stone-900">
      <CardHeader className={isMobile ? 'p-3' : 'p-4'}>
        <CardTitle className={`text-cyan-300 ${isMobile ? 'text-sm' : 'text-base'} flex items-center justify-between`}>
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Test Mode Panel
          </span>
          <Button onClick={onClearLogs} size="sm" variant="outline" className="text-xs">
            Clear
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}>
        {/* Device Info */}
        <div className="mb-3 p-3 bg-stone-900/60 rounded-lg border border-cyan-700/30">
          <h4 className={`font-bold text-cyan-400 mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>Device Info:</h4>
          <div className={`space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <p className="text-stone-300">
              MediaDevices: <span className={deviceInfo.hasMediaDevices ? 'text-emerald-400' : 'text-red-400'}>{deviceInfo.hasMediaDevices ? '✓' : '✗'}</span>
            </p>
            <p className="text-stone-300">
              getUserMedia: <span className={deviceInfo.hasGetUserMedia ? 'text-emerald-400' : 'text-red-400'}>{deviceInfo.hasGetUserMedia ? '✓' : '✗'}</span>
            </p>
            <p className="text-stone-300">
              Audio Devices: <span className="text-amber-400">{deviceInfo.audioDevices}</span>
            </p>
            <p className="text-stone-300">
              Permissions: <span className="text-blue-400">{deviceInfo.permissions}</span>
            </p>
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {logs.length === 0 ? (
            <p className={`text-stone-400 italic ${isMobile ? 'text-xs' : 'text-sm'}`}>No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  log.type === 'success'
                    ? 'bg-emerald-900/30 text-emerald-300'
                    : log.type === 'error'
                    ? 'bg-red-900/30 text-red-300'
                    : log.type === 'warning'
                    ? 'bg-amber-900/30 text-amber-300'
                    : 'bg-blue-900/30 text-blue-300'
                }`}
              >
                <p className={isMobile ? 'text-xs' : 'text-sm'}>
                  <span className="opacity-70">[{log.timestamp}]</span> {log.message}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
);

TestPanel.displayName = 'TestPanel';

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
  const [isMobile, setIsMobile] = useState(false);

  // Test Mode State
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [deviceInfo, setDeviceInfo] = useState({
    hasMediaDevices: false,
    hasGetUserMedia: false,
    audioDevices: 0,
    permissions: 'unknown',
  });

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const addTestLog = useCallback((type: TestLog['type'], message: string) => {
    if (!CONFIG.TEST_MODE) return;

    const timestamp = new Date().toLocaleTimeString();
    setTestLogs((prev) => [...prev.slice(-9), { timestamp, type, message }]);
    console.log(`[VoiceChat ${type}]`, message);
  }, []);

  const checkDeviceSupport = useCallback(async () => {
    try {
      const hasMediaDevices = !!navigator.mediaDevices;
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      addTestLog('info', `MediaDevices: ${hasMediaDevices}, getUserMedia: ${hasGetUserMedia}`);

      let audioDevices = 0;
      let permissions = 'unknown';

      if (hasMediaDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          audioDevices = devices.filter((d) => d.kind === 'audioinput').length;
          addTestLog('success', `Found ${audioDevices} audio input devices`);

          // Check permissions
          if (navigator.permissions) {
            try {
              const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
              permissions = permissionStatus.state;
              addTestLog('info', `Microphone permission: ${permissions}`);
            } catch (e) {
              addTestLog('warning', 'Permissions API not supported');
            }
          }
        } catch (e) {
          addTestLog('error', `Error enumerating devices: ${(e as Error).message}`);
        }
      }

      setDeviceInfo({ hasMediaDevices, hasGetUserMedia, audioDevices, permissions });
    } catch (e) {
      addTestLog('error', `Device check failed: ${(e as Error).message}`);
    }
  }, [addTestLog]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    if (CONFIG.TEST_MODE) {
      addTestLog('info', 'Voice Chat component mounted');
      checkDeviceSupport();
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      cleanup();
    };
  }, [addTestLog, checkDeviceSupport]);

  // ============================================
  // CLEANUP FUNCTION
  // ============================================
  const cleanup = useCallback(() => {
    addTestLog('info', 'Cleaning up voice chat resources');

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
      addTestLog('success', 'Media stream stopped');
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(console.error);
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, [addTestLog]);

  // ============================================
  // AUDIO LEVEL MONITORING
  // ============================================
  const setupAudioLevelMonitoring = useCallback(
    (stream: MediaStream) => {
      try {
        addTestLog('info', 'Setting up audio level monitoring');

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext not supported');
        }

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
        addTestLog('success', 'Audio monitoring started');
      } catch (err) {
        addTestLog('error', `Audio monitoring setup failed: ${(err as Error).message}`);
      }
    },
    [isConnected, addTestLog]
  );

  // ============================================
  // SIGNALING SERVER CONNECTION (MOCK)
  // ============================================
  const connectSignalingServer = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      addTestLog('info', 'Connecting to signaling server (mock)');

      setTimeout(() => {
        const connectedParticipants = new Map(
          participants
            .filter((p) => p.user_id !== userId)
            .map((p, index) => [
              p.user_id,
              {
                userId: p.user_id,
                nickname: p.nickname,
                role: p.role,
                isSpeaking: false,
                audioLevel: 0,
                isConnected: true, // Always connected in test mode
              },
            ])
        );

        setVoiceParticipants(connectedParticipants);
        addTestLog('success', `Connected ${connectedParticipants.size} participants`);
        resolve();
      }, CONFIG.CONNECTION_TIMEOUT);
    });
  }, [participants, userId, addTestLog]);

  // ============================================
  // CONNECT VOICE CHAT
  // ============================================
  const connectVoiceChat = useCallback(async () => {
    try {
      addTestLog('info', 'Starting voice chat connection');
      setConnectionStatus('connecting');
      setError('');

      // Check device support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support voice chat. Please use Chrome, Firefox, or Edge.');
      }

      addTestLog('info', 'Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: CONFIG.AUDIO_CONSTRAINTS,
      });

      addTestLog('success', 'Microphone access granted');
      localStreamRef.current = stream;

      // Get track info
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        addTestLog('info', `Audio track: ${settings.sampleRate}Hz, ${settings.channelCount} channels`);
      }

      setupAudioLevelMonitoring(stream);
      await connectSignalingServer();

      setIsConnected(true);
      setConnectionStatus('connected');
      addTestLog('success', 'Voice chat connected successfully');
      toast.success('Berhasil terhubung ke voice chat!');
    } catch (err: any) {
      console.error('Error connecting to voice chat:', err);
      let errorMessage = 'Gagal terhubung ke altar suara dungeon';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Izin mikrofon ditolak. Silakan izinkan akses mikrofon di pengaturan browser Anda.';
        addTestLog('error', 'Microphone permission denied');
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Mikrofon tidak ditemukan. Pastikan perangkat audio Anda terpasang dengan benar.';
        addTestLog('error', 'Microphone device not found');
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Mikrofon sedang digunakan oleh aplikasi lain.';
        addTestLog('error', 'Microphone in use by another application');
      } else {
        addTestLog('error', `Connection error: ${err.message}`);
      }

      setError(errorMessage);
      setConnectionStatus('error');
      toast.error(errorMessage);
      cleanup();
    }
  }, [cleanup, setupAudioLevelMonitoring, connectSignalingServer, addTestLog]);

  // ============================================
  // DISCONNECT VOICE CHAT
  // ============================================
  const disconnectVoiceChat = useCallback(() => {
    addTestLog('info', 'Disconnecting voice chat');
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setVoiceParticipants(new Map());
    setAudioLevel(0);
    setError('');
    toast.info('Terputus dari voice chat');
  }, [cleanup, addTestLog]);

  // ============================================
  // TOGGLE MUTE
  // ============================================
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;

      audioTracks.forEach((track) => {
        track.enabled = !newMutedState;
      });

      setIsMuted(newMutedState);
      addTestLog('info', `Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
      toast.info(newMutedState ? 'Mikrofon dibisukan' : 'Mikrofon aktif');
    }
  }, [isMuted, addTestLog]);

  // ============================================
  // TOGGLE SPEAKER
  // ============================================
  const toggleSpeaker = useCallback(() => {
    const newState = !isSpeakerMuted;
    setIsSpeakerMuted(newState);
    addTestLog('info', `Speaker ${newState ? 'muted' : 'unmuted'}`);
    toast.info(newState ? 'Speaker dibisukan' : 'Speaker aktif');
  }, [isSpeakerMuted, addTestLog]);

  // ============================================
  // GET STATUS CONFIG
  // ============================================
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-amber-600/30 backdrop-blur-sm rounded-full p-2 border border-amber-600/40">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg md:text-xl'} font-bold text-amber-300 dungeon-glow-text`}>Altar Suara Dungeon</h3>
          </div>
          <div
            className={`flex items-center space-x-2 px-2 sm:px-3 py-1.5 rounded-full ${statusConfig.bgColor} backdrop-blur-sm transition-all duration-300 border ${statusConfig.borderColor}`}
          >
            <StatusIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${statusConfig.color} ${connectionStatus === 'connecting' ? 'dungeon-pulse' : ''}`} />
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold ${statusConfig.color}`}>{statusConfig.text}</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-950/60 border-l-4 border-red-600 rounded-lg animate-[slideDown_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-red">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-200 leading-relaxed`}>{error}</p>
            </div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          {!isConnected ? (
            <Button
              onClick={connectVoiceChat}
              disabled={connectionStatus === 'connecting'}
              className={`flex-1 sm:flex-initial flex items-center justify-center ${
                isMobile ? 'px-4 py-3 text-sm' : 'px-5 py-3 text-base'
              } bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl hover:from-emerald-700 hover:to-green-800 disabled:from-stone-700 disabled:to-stone-800 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold dungeon-button-glow border border-emerald-500/40 touch-manipulation`}
              aria-label="Bergabung ke altar suara"
            >
              <Phone className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
              {connectionStatus === 'connecting' ? 'Memanggil...' : 'Masuki Altar'}
            </Button>
          ) : (
            <>
              <Button
                onClick={disconnectVoiceChat}
                className={`flex items-center justify-center ${
                  isMobile ? 'px-3 py-3 text-sm' : 'px-5 py-3 text-base'
                } bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold border border-red-500/40 touch-manipulation`}
                aria-label="Keluar dari altar suara"
              >
                <PhoneOff className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <span className="hidden sm:inline ml-2">Keluar</span>
              </Button>

              <Button
                onClick={toggleMute}
                className={`flex items-center justify-center ${isMobile ? 'px-3 py-3 text-sm' : 'px-5 py-3 text-base'} rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold ${
                  isMuted
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 border border-red-500/40'
                    : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border-2 border-stone-600'
                } touch-manipulation`}
                aria-label={isMuted ? 'Aktifkan mikrofon' : 'Bisukan mikrofon'}
              >
                {isMuted ? <MicOff className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} /> : <Mic className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />}
                <span className="hidden sm:inline ml-2">{isMuted ? 'Bisu' : 'Aktif'}</span>
              </Button>

              <Button
                onClick={toggleSpeaker}
                className={`flex items-center justify-center ${isMobile ? 'px-3 py-3 text-sm' : 'px-5 py-3 text-base'} rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 font-semibold ${
                  isSpeakerMuted
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 border border-red-500/40'
                    : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border-2 border-stone-600'
                } touch-manipulation`}
                aria-label={isSpeakerMuted ? 'Aktifkan speaker' : 'Bisukan speaker'}
              >
                {isSpeakerMuted ? <VolumeX className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} /> : <Volume2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />}
                <span className="hidden sm:inline ml-2">Speaker</span>
              </Button>
            </>
          )}
        </div>

        {/* Local Audio Level */}
        {isConnected && (
          <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 rounded-xl border-2 border-blue-700/40 shadow-sm animate-[fadeIn_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-blue">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isMuted ? 'bg-red-500' : 'bg-emerald-500'} dungeon-pulse`} />
                <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-blue-200 truncate`}>
                  {nickname} <span className="text-blue-400 font-normal">(Anda)</span>
                </span>
              </div>
              <Badge className={`${roleConfig.color} text-xs flex-shrink-0 ml-2`}>
                <span className="mr-1" aria-hidden="true">
                  {roleConfig.icon}
                </span>
                <span className="hidden sm:inline">{roleConfig.text}</span>
              </Badge>
            </div>

            <div className="relative w-full bg-stone-800 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-150 ${audioLevel > 30 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 dungeon-glow' : 'bg-blue-900'}`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold ${isMuted ? 'text-red-400' : 'text-emerald-400'}`}>
                {isMuted ? '🔇 Kristal Tertutup' : '🎤 Kristal Aktif'}
              </span>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-300 font-medium`}>Resonansi: {audioLevel}%</span>
            </div>
          </div>
        )}

        {/* Voice Participants */}
        {isConnected && voiceParticipants.size > 0 && (
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-amber-300 flex items-center dungeon-glow-text`}>
              <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-red-600 rounded-full mr-2" />
              Petualang Lain ({voiceParticipants.size})
            </h4>

            <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-700 scrollbar-track-stone-900">
              {Array.from(voiceParticipants.values())
                .slice(0, CONFIG.MAX_PARTICIPANTS_DISPLAY)
                .map((participant) => {
                  const participantRoleConfig = ROLE_CONFIG[participant.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.host;
                  return <ParticipantCard key={participant.userId} participant={participant} roleConfig={participantRoleConfig} isMobile={isMobile} />;
                })}
            </div>
          </div>
        )}

        {/* Voice Chat Tips */}
        {isConnected && (
          <div className="mt-4 p-3 sm:p-4 bg-gradient-to-br from-purple-950/40 to-pink-950/40 border-2 border-purple-700/40 rounded-xl shadow-sm animate-[fadeIn_0.3s_ease-out] backdrop-blur-sm dungeon-card-glow-purple">
            <h5 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-purple-300 mb-3 flex items-center dungeon-glow-text`}>
              <span ref={skullRef} className="mr-2">
                💀
              </span>
              Mantra Komunikasi
            </h5>
            <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200 space-y-2`}>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400 flex-shrink-0">⚔️</span>
                <span>Gunakan kata-kata yang jelas dan ringkas</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400 flex-shrink-0">📖</span>
                <span>{role === 'defuser' ? 'Jelaskan apa yang Anda lihat dengan detail' : 'Berikan instruksi yang jelas'}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400 flex-shrink-0">🔇</span>
                <span>Tutup kristal suara saat tidak berbicara</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-purple-400 flex-shrink-0">🗣️</span>
                <span>Berbicara satu per satu untuk menghindari gangguan</span>
              </li>
            </ul>
          </div>
        )}

        {/* Disconnected State */}
        {!isConnected && connectionStatus === 'disconnected' && (
          <div className="p-6 text-center bg-gradient-to-br from-stone-950/40 to-stone-900/40 rounded-xl border-2 border-stone-700/40 backdrop-blur-sm">
            <div ref={skullRef} className="text-5xl sm:text-6xl mb-4 opacity-50">
              💀
            </div>
            <h5 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-stone-400 mb-2 dungeon-glow-text`}>Altar Sunyi Menunggu</h5>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-stone-500 leading-relaxed`}>
              Klik tombol "Masuki Altar" untuk memulai ritual komunikasi dengan petualang lain
            </p>
          </div>
        )}

        {/* Test Mode Panel */}
        {CONFIG.TEST_MODE && <TestPanel logs={testLogs} deviceInfo={deviceInfo} onClearLogs={() => setTestLogs([])} isMobile={isMobile} />}
      </div>

      {/* Styles */}
      <style>{`
        .dungeon-torch-flicker { display: inline-block; }
        .dungeon-card-glow { box-shadow: 0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2); }
        .dungeon-card-glow-green { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2); }
        .dungeon-card-glow-blue { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2); }
        .dungeon-card-glow-purple { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2); }
        .dungeon-card-glow-red { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2); }
        .dungeon-button-glow:hover:not(:disabled) { box-shadow: 0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3); }
        .dungeon-glow-text { text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.4); }
        .dungeon-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .dungeon-glow { filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.6)); }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb { background-color: rgba(180, 83, 9, 0.6); border-radius: 3px; }
        .scrollbar-thumb-amber-700::-webkit-scrollbar-thumb:hover { background-color: rgba(180, 83, 9, 0.8); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .touch-manipulation { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        *:focus-visible { outline: 2px solid rgba(251, 191, 36, 0.8); outline-offset: 2px; }
        @media (max-width: 768px) {
          .dungeon-card-glow, .dungeon-card-glow-green, .dungeon-card-glow-blue, .dungeon-card-glow-purple, .dungeon-card-glow-red {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
