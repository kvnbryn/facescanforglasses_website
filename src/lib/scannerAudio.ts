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
    window.speechSynthesis.resume(); // Ensure engine is not stuck on iOS/Safari
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
    if (muted || typeof window === 'undefined') return;
    
    try {
      const audio = new Audio('/Camerashutter.mp3');
      audio.volume = 1.0;
      await audio.play();
    } catch (err) {
      console.warn("Could not play shutter sound:", err);
    }
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
