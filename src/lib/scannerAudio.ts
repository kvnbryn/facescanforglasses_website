type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type ScanGraph = {
  context: AudioContext;
  master: GainNode;
  sources: AudioScheduledSourceNode[];
  pulseTimer: number | null;
};

const TARGET_SCAN_VOLUME = 0.24;

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
  playComplete: (muted: boolean) => Promise<void>;
  destroy: () => void;
};

export const createScannerAudioController = (): ScannerAudioController => {
  let context: AudioContext | null = null;
  let graph: ScanGraph | null = null;

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

  const setMuted = (muted: boolean) => {
    if (!graph) return;

    const now = graph.context.currentTime;
    graph.master.gain.cancelScheduledValues(now);
    graph.master.gain.setTargetAtTime(muted ? 0 : TARGET_SCAN_VOLUME, now, 0.08);
  };

  const stopScan = () => {
    if (!graph) return;

    const activeGraph = graph;
    graph = null;

    if (activeGraph.pulseTimer !== null) {
      window.clearInterval(activeGraph.pulseTimer);
    }

    const now = activeGraph.context.currentTime;
    activeGraph.master.gain.cancelScheduledValues(now);
    activeGraph.master.gain.setTargetAtTime(0.0001, now, 0.08);

    activeGraph.sources.forEach((source) => {
      try {
        source.stop(now + 0.2);
      } catch {
        // Source may have already ended.
      }
    });

    window.setTimeout(() => {
      try {
        activeGraph.master.disconnect();
      } catch {
        // The node can already be disconnected on rapid reset.
      }
    }, 350);
  };

  const scheduleSoftPulse = (activeGraph: ScanGraph) => {
    const { context: audioContext, master } = activeGraph;
    const now = audioContext.currentTime;

    const pulse = audioContext.createBufferSource();
    const pulseGain = audioContext.createGain();
    const pulseFilter = audioContext.createBiquadFilter();
    const tick = audioContext.createOscillator();
    const tickGain = audioContext.createGain();

    pulse.buffer = createNoiseBuffer(audioContext);
    pulseFilter.type = 'bandpass';
    pulseFilter.frequency.value = 1150;
    pulseFilter.Q.value = 1.8;

    pulseGain.gain.setValueAtTime(0.0001, now);
    pulseGain.gain.linearRampToValueAtTime(0.052, now + 0.02);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    tick.type = 'sine';
    tick.frequency.setValueAtTime(880, now);
    tick.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    tickGain.gain.setValueAtTime(0.0001, now);
    tickGain.gain.linearRampToValueAtTime(0.032, now + 0.018);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    pulse.connect(pulseFilter);
    pulseFilter.connect(pulseGain);
    pulseGain.connect(master);
    tick.connect(tickGain);
    tickGain.connect(master);

    pulse.start(now);
    tick.start(now);
    pulse.stop(now + 0.2);
    tick.stop(now + 0.16);
  };

  const startScan = async (muted: boolean) => {
    const audioContext = await ensureContext();
    if (!audioContext || graph) {
      setMuted(muted);
      return;
    }

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : TARGET_SCAN_VOLUME, now + 0.6);
    master.connect(audioContext.destination);

    const lowHum = audioContext.createOscillator();
    const lowHumGain = audioContext.createGain();
    lowHum.type = 'sine';
    lowHum.frequency.value = 54;
    lowHumGain.gain.value = 0.26;
    lowHum.connect(lowHumGain);
    lowHumGain.connect(master);

    const warmPad = audioContext.createOscillator();
    const warmPadGain = audioContext.createGain();
    warmPad.type = 'sine';
    warmPad.frequency.value = 146.83;
    warmPadGain.gain.value = 0.038;
    warmPad.connect(warmPadGain);
    warmPadGain.connect(master);

    const airTone = audioContext.createOscillator();
    const airToneGain = audioContext.createGain();
    airTone.type = 'sine';
    airTone.frequency.value = 293.66;
    airToneGain.gain.value = 0.018;
    airTone.connect(airToneGain);
    airToneGain.connect(master);

    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noise.buffer = createNoiseBuffer(audioContext);
    noise.loop = true;
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 2400;
    noiseFilter.Q.value = 0.35;
    noiseGain.gain.value = 0.045;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    const sources = [lowHum, warmPad, airTone, noise];
    sources.forEach((source) => source.start(now));

    graph = {
      context: audioContext,
      master,
      sources,
      pulseTimer: null,
    };

    scheduleSoftPulse(graph);
    graph.pulseTimer = window.setInterval(() => {
      if (graph) scheduleSoftPulse(graph);
    }, 720);
  };

  const playComplete = async (muted: boolean) => {
    if (muted) return;

    const audioContext = await ensureContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.11, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    master.connect(audioContext.destination);

    [392, 587.33].forEach((frequency, index) => {
      const tone = audioContext.createOscillator();
      const toneGain = audioContext.createGain();
      const start = now + index * 0.08;

      tone.type = 'sine';
      tone.frequency.setValueAtTime(frequency, start);
      toneGain.gain.setValueAtTime(0.0001, start);
      toneGain.gain.linearRampToValueAtTime(0.045, start + 0.04);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

      tone.connect(toneGain);
      toneGain.connect(master);
      tone.start(start);
      tone.stop(start + 0.62);
    });

    window.setTimeout(() => {
      try {
        master.disconnect();
      } catch {
        // The node may already be disconnected if the page reset quickly.
      }
    }, 1400);
  };

  return {
    unlock: async () => {
      await ensureContext();
    },
    startScan,
    triggerPulse: async (muted: boolean) => {
      if (muted) return;

      const audioContext = await ensureContext();
      if (!audioContext) return;

      const pulseMaster = audioContext.createGain();
      const now = audioContext.currentTime;
      pulseMaster.gain.setValueAtTime(0.0001, now);
      pulseMaster.gain.linearRampToValueAtTime(0.12, now + 0.025);
      pulseMaster.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      pulseMaster.connect(audioContext.destination);

      [660, 990].forEach((frequency, index) => {
        const tone = audioContext.createOscillator();
        const toneGain = audioContext.createGain();
        const start = now + index * 0.045;

        tone.type = 'sine';
        tone.frequency.setValueAtTime(frequency, start);
        toneGain.gain.setValueAtTime(0.0001, start);
        toneGain.gain.linearRampToValueAtTime(0.04, start + 0.018);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
        tone.connect(toneGain);
        toneGain.connect(pulseMaster);
        tone.start(start);
        tone.stop(start + 0.28);
      });

      window.setTimeout(() => {
        try {
          pulseMaster.disconnect();
        } catch {
          // Rapid phase resets may disconnect this node first.
        }
      }, 520);
    },
    setMuted,
    stopScan,
    playComplete,
    destroy: () => {
      stopScan();
      context?.close().catch(() => {});
      context = null;
    },
  };
};
