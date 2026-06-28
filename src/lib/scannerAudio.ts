type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const getAudioContextCtor = () => {
  if (typeof window === 'undefined') return null;
  const audioWindow = window as AudioWindow;
  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
};

const createNoiseBuffer = (context: AudioContext) => {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.35;
  }
  return buffer;
};

export type ScannerAudioController = {
  unlock: () => Promise<void>;
  startScan: (muted: boolean) => Promise<void>;
  triggerPulse: (muted: boolean) => Promise<void>;
  setMuted: (muted: boolean) => void;
  stopScan: () => void;
  playProcessing: (muted: boolean) => Promise<void>;
  playComplete: (muted: boolean) => Promise<void>;
  playShutter: (muted: boolean) => Promise<void>;
  destroy: () => void;
};

export const createScannerAudioController = (): ScannerAudioController => {
  let context: AudioContext | null = null;
  let isMutedState = false;

  const ensureContext = async () => {
    if (context) {
      if (context.state === 'suspended') await context.resume();
      return context;
    }
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return null;
    context = new AudioContextCtor();
    if (context.state === 'suspended') await context.resume();
    return context;
  };

  const speak = (text: string) => {
    if (isMutedState || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha')));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  const setMuted = (muted: boolean) => {
    isMutedState = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopScan = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const startScan = async (muted: boolean) => {
    setMuted(muted);
    await ensureContext();
    speak("Start scanning.");
  };

  const playProcessing = async (muted: boolean) => {
    setMuted(muted);
    speak("Analyzing biometrics and matching frames.");
  };

  const playComplete = async (muted: boolean) => {
    setMuted(muted);
    speak("Scan completed.");
  };

  const playShutter = async (muted: boolean) => {
    setMuted(muted);
    if (muted) return;
    const audioContext = await ensureContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // High frequency click (mechanical part 1)
    const osc1 = audioContext.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(6000, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.02);
    const gain1 = audioContext.createGain();
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.8, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start(now);
    osc1.stop(now + 0.04);

    // Lower frequency thud (mechanical part 2)
    const osc2 = audioContext.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(400, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.08);
    const gain2 = audioContext.createGain();
    gain2.gain.setValueAtTime(0, now + 0.03);
    gain2.gain.linearRampToValueAtTime(0.6, now + 0.035);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.11);

    // Burst of white noise (the 'shh' of the shutter)
    const noise = audioContext.createBufferSource();
    noise.buffer = createNoiseBuffer(audioContext);
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + 0.09);
  };

  return {
    unlock: async () => {
      await ensureContext();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
      }
    },
    startScan,
    triggerPulse: async () => {},
    setMuted,
    stopScan,
    playProcessing,
    playComplete,
    playShutter,
    destroy: () => { stopScan(); }
  };
};
