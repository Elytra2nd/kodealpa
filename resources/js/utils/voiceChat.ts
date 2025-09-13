export interface VoiceChatConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceChatConfig = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100
};

export class VoiceChatManager {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  async initializeAudio(config: VoiceChatConfig = DEFAULT_VOICE_CONFIG): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: config
      });

      this.setupAudioAnalysis();
      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw new Error('Microphone access denied');
    }
  }

  private setupAudioAnalysis() {
    if (!this.localStream) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.localStream);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
  }

  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return Math.round((average / 255) * 100);
  }

  toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const voiceChatManager = new VoiceChatManager();
