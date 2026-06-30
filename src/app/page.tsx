'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import Script from 'next/script';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Power,
  ScanLine,
  ShieldAlert,
  Volume2,
  VolumeX,
  ScanFace,
  SwitchCamera,
} from 'lucide-react';
import GlassesCard from '@/components/GlassesCard';
import Hero from '@/components/Hero';
import ScannerHUD from '@/components/ScannerHUD';
import { createScannerAudioController, type ScannerAudioController } from '@/lib/scannerAudio';

const AILiquidOrb = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <motion.div
        animate={{
          rotate: [0, 360],
          borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 60% 30% 70% 40%", "50% 60% 60% 40% / 40% 50% 50% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
        }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-400 opacity-80 mix-blend-screen blur-[2px]"
      />
      <motion.div
        animate={{
          rotate: [360, 0],
          borderRadius: ["60% 40% 30% 70% / 60% 30% 70% 40%", "50% 60% 60% 40% / 40% 50% 50% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 60% 30% 70% 40%"]
        }}
        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-bl from-indigo-500 via-fuchsia-600 to-sky-300 opacity-80 mix-blend-screen blur-[2px] scale-95"
      />
      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-900/60 to-purple-900/60 backdrop-blur-sm shadow-[0_0_30px_rgba(139,92,246,0.6)]" />
      <div className="absolute inset-0 rounded-full border border-white/20 animate-[ping_3s_ease-in-out_infinite]" />
      <span className="text-white font-bold text-4xl tracking-widest relative z-20 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">AI</span>
    </div>
  )
}

const ProcessLabel = ({ text, delay, className }: { text: string, delay: number, className?: string }) => {
  const [status, setStatus] = useState("pending");
  
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStatus("active");
    }, delay);
    
    const endTimer = setTimeout(() => {
      setStatus("done");
    }, delay + 1000);
    
    return () => { clearTimeout(startTimer); clearTimeout(endTimer); };
  }, [delay]);
  
  if (status === "pending") return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute ${className} text-[10px] sm:text-xs px-2 py-1 rounded transition-colors duration-300 shadow-lg ${status === "active" ? "bg-zinc-800/80 border border-zinc-700 animate-pulse text-sky-300" : "bg-sky-900/80 border border-sky-500/50 text-white"}`}
    >
      {status === "active" ? (
        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {text}...</span>
      ) : (
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> {text}</span>
      )}
    </motion.div>
  )
};

type GlassesModel = { name: string; img: string; reason: string; score: number };
type FaceShape = 'Oval' | 'Round' | 'Square' | 'Heart' | 'Oblong';
type GlassesCategory = {
  title: string;
  desc: string;
  stats: { jaw: string; cheek: string; ratio: string };
  recs: GlassesModel[];
};
type Phase = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'TRY_ON' | 'RESULT' | 'ERROR';
type ActiveStep = 1;
type FaceLandmark = { x: number; y: number; z?: number };
type FaceMeshResults = { multiFaceLandmarks?: FaceLandmark[][] };
type FaceMeshInstance = {
  setOptions: (options: {
    maxNumFaces: number;
    refineLandmarks: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: FaceMeshResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void> | void;
};
type MediaPipeWindow = Window &
  typeof globalThis & {
    FaceMesh?: new (config: { locateFile: (file: string) => string }) => FaceMeshInstance;
    drawConnectors?: (
      ctx: CanvasRenderingContext2D,
      landmarks: FaceLandmark[],
      connections: unknown,
      style: { color: string; lineWidth: number },
    ) => void;
    FACEMESH_TESSELATION?: unknown;
  };
type ScanResult = { shape: FaceShape; image: string; confidence: number };
type ScanMetrics = {
  shape: FaceShape | 'Pending';
  ratio: string;
  ipd: string;
  jawAngle: string;
  fps: number;
  landmarks: number;
  symmetryDelta: string;
};

const SCAN_DURATION_MS = 8500;
const SAMPLE_INTERVAL_MS = 150;
const PROCESSING_DELAY_MS = 1200;

const GLASSES_DB: Record<FaceShape, GlassesCategory> = {
  Oval: {
    title: 'Oval Shape',
    desc: 'Proporsi wajah Anda sangat seimbang (Golden Ratio). Bentuk ini memberikan kebebasan visual untuk menggunakan hampir semua jenis frame dengan tetap mempertahankan kesan profesional.',
    stats: { jaw: 'Balanced', cheek: 'High', ratio: '1.45' },
    recs: [
      { name: 'Aviator Series', img: '/glasses/Aviator eyeglasses.webp', reason: 'Garis klasik Aviator memberikan karakter maskulin yang tegas namun tetap elegan.', score: 98 },
      { name: 'Wayfarer Classic', img: '/glasses/Wayfarer eyeglasses.webp', reason: 'Pilihan timeless yang mengikuti struktur tulang pipi dengan natural.', score: 95 },
      { name: 'Butterfly Effect', img: '/glasses/Butterfly eyeglasses.webp', reason: 'Memberikan dimensi lebar yang harmonis.', score: 92 },
    ],
  },
  Round: {
    title: 'Round Shape',
    desc: 'Wajah bulat sangat cocok menggunakan frame berbentuk kotak karena ada kesan elegan dan lebih terpercaya, serta memberikan definisi struktur yang lebih tegas pada wajah Anda.',
    stats: { jaw: 'Soft', cheek: 'Full', ratio: '1.05' },
    recs: [
      { name: 'Rectangular Sharp', img: '/glasses/Rectangular eyeglasses.webp', reason: 'Sudut tajam frame ini memberikan ilusi wajah yang lebih tirus dan profesional.', score: 97 },
      { name: 'Wayfarer Bold', img: '/glasses/Wayfarer eyeglasses.webp', reason: 'Ketebalan frame memberikan definisi instan pada garis pipi Anda.', score: 94 }
    ],
  },
  Square: {
    title: 'Square Shape',
    desc: 'Rahang tegas adalah aset terkuat Anda. Frame dengan sudut melengkung (Curved) akan menyeimbangkan fitur wajah, memberikan kesan yang lebih approachable namun tetap maskulin.',
    stats: { jaw: 'Strong', cheek: 'Wide', ratio: '1.00' },
    recs: [
      { name: 'Oval Minimalist', img: '/glasses/Oval eyeglasses.webp', reason: 'Kontras sempurna untuk melembutkan garis rahang yang tajam.', score: 99 },
      { name: 'Aviator Pilot', img: '/glasses/Aviator eyeglasses.webp', reason: 'Bentuk teardrop secara alami menyeimbangkan dagu yang lebar.', score: 96 },
      { name: 'Butterfly Chic', img: '/glasses/Butterfly eyeglasses.webp', reason: 'Lengkungan luarnya memecah kesan kaku pada wajah.', score: 91 },
    ],
  },
  Heart: {
    title: 'Heart Shape',
    desc: 'Karakteristik dahi lebar dan dagu lancip. Keseimbangan visual dapat dicapai dengan frame yang memiliki bagian bawah lebih lebar atau detail minimalis di bagian atas.',
    stats: { jaw: 'Narrow', cheek: 'Prominent', ratio: '1.30' },
    recs: [
      { name: 'Cat Eye', img: '/glasses/Butterfly eyeglasses.webp', reason: 'Mengikuti garis alami tulang pipi untuk tampilan yang sophisticated.', score: 98 },
      { name: 'Wayfarer', img: '/glasses/Wayfarer eyeglasses.webp', reason: 'Bagian bawah frame yang tebal menyeimbangkan dagu lancip.', score: 93 },
      { name: 'Oval Soft', img: '/glasses/Oval eyeglasses.webp', reason: 'Menetralisir ketajaman dagu secara elegan.', score: 90 },
    ],
  },
  Oblong: {
    title: 'Oblong Shape',
    desc: 'Wajah dengan karakteristik panjang yang noble. Membutuhkan ilusi lebar horizontal, yang bisa didapatkan dari frame oversized atau gagang (temple) yang memiliki dekorasi.',
    stats: { jaw: 'Elongated', cheek: 'Flat', ratio: '1.60' },
    recs: [
      { name: 'Aviator Wide', img: '/glasses/Aviator eyeglasses.webp', reason: 'Bentuk melebar ke samping memberikan keseimbangan proporsi.', score: 94 },
      { name: 'Rectangular', img: '/glasses/Rectangular eyeglasses.webp', reason: 'Menambah dimensi horizontal secara signifikan.', score: 91 }
    ],
  },
};

const initialMetrics: ScanMetrics = {
  shape: 'Pending',
  ratio: '0.00',
  ipd: '0.0',
  jawAngle: '0.0',
  fps: 0,
  landmarks: 0,
  symmetryDelta: '0.00',
};

const calibrationSteps = [
  {
    id: 1 as ActiveStep,
    title: 'Biometric Analysis',
    image: '/hadapdepan1.png',
  },
];

const HiddenPreloader = () => {
  const allImages = Object.values(GLASSES_DB).flatMap((category) => category.recs.map((rec) => rec.img));
  const instructionImages = ['/hadapdepan1.png'];

  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      {[...allImages, ...instructionImages].map((src, i) => (
        <img key={i} src={src} alt="preload" loading="eager" />
      ))}
    </div>
  );
};

const getActiveStep = (progress: number): ActiveStep => {
  return 1;
};

const getScanStatus = (progress: number) => {
  return 'PREPARING FRONTAL MEASUREMENT';
};

const formatLogTime = () =>
  new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const addLogLine = (setLogs: Dispatch<SetStateAction<string[]>>, line: string) => {
  setLogs((prev) => [`[${formatLogTime()}] ${line}`, ...prev].slice(0, 12));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getRecommendations = (shape: string) => {
  switch (shape) {
    case 'Round':
      return {
        reco: { shapes: 'Square, Rectangular, Cat-eye, Geometric', desc: '* Angular frames add structure and contrast soft facial curves.' },
        avoid: { shapes: 'Round, Circular, Oversized', desc: '* Circular frames emphasize roundness and lack definition.' }
      };
    case 'Square':
      return {
        reco: { shapes: 'Round, Oval, Aviator, Browline', desc: '* Curved frames soften strong jawlines and angular features.' },
        avoid: { shapes: 'Square, Rectangular, Geometric', desc: '* Sharp angles exaggerate the jawline and brow.' }
      };
    case 'Oval':
      return {
        reco: { shapes: 'Almost all shapes, Wayfarer, Aviator', desc: '* Balanced proportions allow for maximum versatility.' },
        avoid: { shapes: 'Overly oversized frames', desc: '* Frames that are too large disrupt natural symmetry.' }
      };
    case 'Heart':
      return {
        reco: { shapes: 'Bottom-heavy, Aviator, Oval', desc: '* Frames wider at the bottom balance a narrow chin.' },
        avoid: { shapes: 'Top-heavy, Browline, Cat-eye', desc: '* Emphasizes the already wide upper half of the face.' }
      };
    case 'Oblong':
    default:
      return {
        reco: { shapes: 'Tall frames, Oversized, Thick frames', desc: '* Taller lenses break up the length of the face visually.' },
        avoid: { shapes: 'Narrow, Rectangular, Small frames', desc: '* Narrow frames elongate the face further.' }
      };
  }
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [errorMessage, setErrorMessage] = useState('Kamera tidak dapat diakses.');
  const [isMuted, setIsMuted] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState({ mesh: false, drawing: false });
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMetrics, setScanMetrics] = useState<ScanMetrics>(initialMetrics);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    '[00:00:00] Awaiting biometric camera permission.',
    '[00:00:00] Diagnostic frame matcher staged.',
  ]);
  const [showReport, setShowReport] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [captureOverlay, setCaptureOverlay] = useState<{ image: string; step: ActiveStep } | null>(null);
  const [capturedImages, setCapturedImages] = useState<{ front: string | null }>({ front: null });
  const [finalResult, setFinalResult] = useState<{ 
    frontImage: string; 
    shape: FaceShape; 
    confidence: string;
    lines: { top: string; left: string; width: string }[];
    metrics: Record<string, string>;
    eyeLeft?: { x: number, y: number };
    eyeRight?: { x: number, y: number };
    faceLeft?: { x: number, y: number };
    faceRight?: { x: number, y: number };
    videoWidth?: number;
    videoHeight?: number;
  } | null>(null);
  const [selectedGlassesIndex, setSelectedGlassesIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<FaceMeshInstance | null>(null);
  const scannerAudioRef = useRef<ScannerAudioController | null>(null);

  const isScanningRef = useRef(false);
  const isCapturingRef = useRef(false);
  const captureTimeoutRef = useRef<number | null>(null);
  const scanStartedAtRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const lastLogAtRef = useRef(0);
  const activeStepRef = useRef<ActiveStep>(1);
  const detectionRafRef = useRef<number | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);
  const resultsBuffer = useRef<FaceShape[]>([]);

  const activeStep = getActiveStep(scanProgress);
  const scanStatus = getScanStatus(scanProgress);
  const engineReady = scriptsLoaded.mesh && scriptsLoaded.drawing;
  const resultData = finalResult ? GLASSES_DB[finalResult.shape] : GLASSES_DB.Oval;
  const circumference = 2 * Math.PI * 42;

  useEffect(() => {
    scannerAudioRef.current = createScannerAudioController();

    return () => {
      stopAllSounds();
      stopCamera();
      scannerAudioRef.current?.destroy();
      scannerAudioRef.current = null;
      if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    scannerAudioRef.current?.setMuted(isMuted);
  }, [isMuted]);

  const playScanSound = () => {
    scannerAudioRef.current?.startScan(isMuted).catch(() => {});
  };

  const playResultSound = () => {
    scannerAudioRef.current?.playComplete(isMuted).catch(() => {});
  };

  const stopAllSounds = () => {
    scannerAudioRef.current?.stopScan();
  };

  const unlockAudioContext = () => {
    if (!scannerAudioRef.current) scannerAudioRef.current = createScannerAudioController();
    scannerAudioRef.current.unlock().catch(() => {});
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Browser memblokir kamera. Gunakan HTTPS atau Localhost.');
      setPhase('ERROR');
      setIsInitializing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 }, // Request portrait
          facingMode: mode,
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');

        try {
          if (videoRef.current.readyState < 1) {
            await new Promise<void>((resolve) => {
              if (!videoRef.current) {
                resolve();
                return;
              }
              videoRef.current.onloadedmetadata = () => resolve();
            });
          }
          await videoRef.current.play();
        } catch {
          console.log('Auto-play blocked, waiting for interaction');
        }

        setPhase('SCANNING');
        isScanningRef.current = true;
        scanStartedAtRef.current = null;
        lastSampleAtRef.current = 0;
        lastFrameAtRef.current = 0;
        lastLogAtRef.current = 0;
        activeStepRef.current = 1;
        resultsBuffer.current = [];
        setScanProgress(0);
        setScanMetrics(initialMetrics);
        setSystemLogs([
          `[${formatLogTime()}] Camera stream locked. Waiting for mesh stabilization.`,
          `[${formatLogTime()}] Calibration sequence armed for 8500ms pass.`,
        ]);
        playScanSound();
        startDetectionLoop();
      }
    } catch (err) {
      console.error('Camera Error:', err);
      setErrorMessage('Izin kamera ditolak. Silakan reset permission browser.');
      setPhase('ERROR');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    scanStartedAtRef.current = null;
    lastSampleAtRef.current = 0;
    lastFrameAtRef.current = 0;
    lastLogAtRef.current = 0;

    if (detectionRafRef.current !== null) {
      window.cancelAnimationFrame(detectionRafRef.current);
      detectionRafRef.current = null;
    }

    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    if (phase === 'SCANNING') {
      stopCamera();
      setIsInitializing(true);
      await startCamera(newMode);
      startDetectionLoop();
      setIsInitializing(false);
    }
  };

  const initFaceMesh = async () => {
    if (faceMeshRef.current) return;
    setIsInitializing(true);

    const waitForScript = new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const check = window.setInterval(() => {
        if ((window as MediaPipeWindow).FaceMesh) {
          window.clearInterval(check);
          resolve();
        } else {
          attempts += 1;
          if (attempts > 50) {
            window.clearInterval(check);
            reject(new Error('Script timeout'));
          }
        }
      }, 100);
    });

    try {
      await waitForScript;

      const FaceMesh = (window as MediaPipeWindow).FaceMesh;
      if (!FaceMesh) throw new Error('FaceMesh script is not available');

      const faceMesh = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;
    } catch (e) {
      console.error('AI Error:', e);
      setErrorMessage('Gagal memuat AI Engine. Periksa koneksi internet.');
      setPhase('ERROR');
      setIsInitializing(false);
    }
  };

  const handleStartScan = async () => {
    unlockAudioContext();
    scannerAudioRef.current?.stopScan();
    if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    
    setPhase('SCANNING');
    setScanProgress(0);
    
    setIsInitializing(true);
    await initFaceMesh();
    await startCamera(facingMode);
  };

  const startDetectionLoop = () => {
    const detect = async () => {
      if (!isScanningRef.current || !videoRef.current || !faceMeshRef.current) return;

      if (videoRef.current.readyState === 4) {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch {
          // MediaPipe may drop a frame on camera transitions.
        }
      }

      detectionRafRef.current = window.requestAnimationFrame(detect);
    };

    detect();
  };

  const calculateFaceMetrics = (
    landmarks: FaceLandmark[],
    w: number,
    h: number,
    fps: number,
  ): ScanMetrics => {
    const p = (idx: number) => landmarks[idx];
    const dist = (i1: number, i2: number) => {
      const dx = (p(i1).x - p(i2).x) * w;
      const dy = (p(i1).y - p(i2).y) * h;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const foreheadWidth = dist(103, 332);
    const jawWidth = dist(172, 397);
    const leftEye = p(33);
    const rightEye = p(263);
    const nose = p(1);
    const faceCenter = (p(234).x + p(454).x) / 2;
    const jawAngle = Math.abs(Math.atan2((p(397).y - p(172).y) * h, (p(397).x - p(172).x) * w) * (180 / Math.PI));
    const shape = estimateFaceShape(landmarks, w);
    const ipd = clamp(dist(33, 263) * 0.28, 54, 74);

    return {
      shape,
      ratio: (foreheadWidth / jawWidth).toFixed(2),
      ipd: ipd.toFixed(1),
      jawAngle: jawAngle.toFixed(1),
      fps,
      landmarks: landmarks.length,
      symmetryDelta: Math.abs((nose.x - faceCenter) * 100).toFixed(2),
    };
  };

  const estimateFaceShape = (landmarks: FaceLandmark[], w: number) => {
    const p = (idx: number) => landmarks[idx];
    const dist = (i1: number, i2: number) => {
      const dx = (p(i1).x - p(i2).x) * w;
      const dy = (p(i1).y - p(i2).y) * w; // Use w for consistency
      return Math.sqrt(dx * dx + dy * dy);
    };
    const faceWidth = dist(234, 454);
    const faceHeight = dist(10, 152);
    const jawWidth = dist(172, 397);
    const ratio = faceHeight / faceWidth;

    if (ratio > 1.45) return 'Oval';
    if (ratio < 1.25) return jawWidth > faceWidth * 0.8 ? 'Square' : 'Round';
    return jawWidth > faceWidth * 0.75 ? 'Square' : 'Heart';
  };

  const estimatePose = (landmarks: FaceLandmark[], w: number) => {
    const nose = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    const leftDist = Math.abs((nose.x - leftCheek.x) * w);
    const rightDist = Math.abs((rightCheek.x - nose.x) * w);
    const totalDist = leftDist + rightDist;
    const ratio = leftDist / totalDist;

    // Jika user nengok ke Kanan (secara fisik), pantulan layar mereka nengok ke Kiri.
    // UI bilang "Hadap Kiri" berarti mereka harus noleh ke Kanan agar pantulan di layar pas di area kiri.
    // Threshold dinaikkan drastis agar butuh putaran kepala yang jauh (bener-bener hadap samping).
    if (ratio > 0.80) return 'LEFT';
    if (ratio < 0.20) return 'RIGHT';
    if (ratio >= 0.4 && ratio <= 0.6) return 'FRONT';
    return 'UNKNOWN';
  };

  const poseHoldCounterRef = useRef<number>(0);
  const lastProgressUpdateRef = useRef<number>(0);
  const lastProgressValRef = useRef<number>(0);
  const capturedImagesRef = useRef<{ 
    front: string | null;
    lines: { top: string; left: string; width: string }[];
    metrics: Record<string, string>;
    eyeLeft?: { x: number, y: number };
    eyeRight?: { x: number, y: number };
    faceLeft?: { x: number, y: number };
    faceRight?: { x: number, y: number };
    videoWidth?: number;
    videoHeight?: number;
  }>({ front: null, lines: [], metrics: {} });

  const onResults = (results: FaceMeshResults) => {
    if (!canvasRef.current || !videoRef.current || videoRef.current.readyState !== 4) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    if (!videoWidth || !videoHeight) return;

    if (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight) {
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const mediaPipeWindow = window as MediaPipeWindow;
      const mpDraw = mediaPipeWindow.drawConnectors;
      const mpTesselation = mediaPipeWindow.FACEMESH_TESSELATION;
      const now = performance.now();
      const fps = lastFrameAtRef.current ? 1000 / Math.max(1, now - lastFrameAtRef.current) : 0;
      lastFrameAtRef.current = now;

      // We no longer draw the mesh continuously in realtime. The video remains clear.

      if (isScanningRef.current) {
        if (scanStartedAtRef.current === null) {
          scanStartedAtRef.current = now;
          lastSampleAtRef.current = now;
          poseHoldCounterRef.current = 0;
        }

        // If currently in a capture overlay sequence, skip processing new frames
        if (isCapturingRef.current) return;

        const currentPose = estimatePose(landmarks, videoWidth);
        const currentStep = activeStepRef.current;

        let targetPose = 'NONE';
        if (currentStep === 1) targetPose = 'FRONT';
        else if (currentStep === 2) targetPose = 'LEFT';
        else if (currentStep === 3) targetPose = 'RIGHT';

        if (currentPose === targetPose) {
          poseHoldCounterRef.current += 1;
          const progress = Math.min((poseHoldCounterRef.current / 90) * 100, 100);
          setScanProgress(Math.floor(progress));
        } else {
          poseHoldCounterRef.current = 0; // Reset completely if pose is lost for strict snapshot
          setScanProgress(0);
        }

        // SNAPSHOT LOGIC: Once pose held for ~3 seconds, trigger capture
        if (poseHoldCounterRef.current >= 90) {
          isCapturingRef.current = true;
          
          const center = (p1: FaceLandmark, p2: FaceLandmark) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
          const leftEyeCenter = center(landmarks[33], landmarks[133]);
          const rightEyeCenter = center(landmarks[362], landmarks[263]);
          
          const faceDist = Math.abs(landmarks[454].x - landmarks[234].x);
          const scale = 145.0 / faceDist; // mm per normalized unit
          
          capturedImagesRef.current.lines = [
            { top: `${landmarks[164].y * 100}%`, left: `${Math.min(landmarks[234].x, landmarks[454].x) * 100}%`, width: `${Math.abs(landmarks[454].x - landmarks[234].x) * 100}%` }, // Face Width
            { top: `${((leftEyeCenter.y + rightEyeCenter.y) / 2) * 100}%`, left: `${Math.min(leftEyeCenter.x, rightEyeCenter.x) * 100}%`, width: `${Math.abs(rightEyeCenter.x - leftEyeCenter.x) * 100}%` }, // PD
            { top: `${((landmarks[133].y + landmarks[362].y) / 2) * 100}%`, left: `${Math.min(landmarks[133].x, landmarks[362].x) * 100}%`, width: `${Math.abs(landmarks[362].x - landmarks[133].x) * 100}%` }, // ICD
            { top: `${((landmarks[33].y + landmarks[263].y) / 2) * 100}%`, left: `${Math.min(landmarks[33].x, landmarks[263].x) * 100}%`, width: `${Math.abs(landmarks[263].x - landmarks[33].x) * 100}%` }, // OCD
            { top: `${((landmarks[129].y + landmarks[358].y) / 2) * 100}%`, left: `${Math.min(landmarks[129].x, landmarks[358].x) * 100}%`, width: `${Math.abs(landmarks[358].x - landmarks[129].x) * 100}%` } // Nose
          ];
          
          capturedImagesRef.current.metrics = {
            'Nose Width': (Math.abs(landmarks[358].x - landmarks[129].x) * scale).toFixed(1) + 'mm',
            'ICD': (Math.abs(landmarks[362].x - landmarks[133].x) * scale).toFixed(1) + 'mm',
            'PD': (Math.abs(rightEyeCenter.x - leftEyeCenter.x) * scale).toFixed(1) + 'mm',
            'OCD': (Math.abs(landmarks[263].x - landmarks[33].x) * scale).toFixed(1) + 'mm',
            'Face Width': '145.0mm',
            'Eye-Ear Distance': (85 + Math.random() * 10).toFixed(1) + 'mm',
            'Cranial Symmetry Index': (95 + Math.random() * 4).toFixed(1) + '%',
            'Orbital Alignment': 'NOMINAL'
          };
          
          // Draw mesh to the canvas JUST for this captured frame
          if (mpDraw && mpTesselation) {
            canvasCtx.save();
            canvasCtx.shadowBlur = 4;
            canvasCtx.shadowColor = 'rgba(16, 185, 129, 0.7)';
            mpDraw(canvasCtx, landmarks, mpTesselation, {
              color: 'rgba(16, 185, 129, 0.3)',
              lineWidth: 0.6,
            });
            canvasCtx.shadowBlur = 0;
            canvasCtx.shadowColor = 'transparent';

            canvasCtx.fillStyle = 'rgba(52, 211, 153, 0.9)';
            canvasCtx.beginPath();
            for (let i = 0; i < landmarks.length; i += 1) {
              const x = landmarks[i].x * videoWidth;
              const y = landmarks[i].y * videoHeight;
              canvasCtx.moveTo(x + 1.2, y);
              canvasCtx.arc(x, y, 1.2, 0, 2 * Math.PI);
            }
            canvasCtx.fill();
            canvasCtx.restore();
          }

          // Composite synced image + mesh into a data URL for the overlay
          const snapCanvas = document.createElement('canvas');
          snapCanvas.width = videoWidth;
          snapCanvas.height = videoHeight;
          const snapCtx = snapCanvas.getContext('2d');
          if (snapCtx) {
            // Draw raw unmirrored synced frame from results.image
            snapCtx.drawImage((results as any).image, 0, 0, videoWidth, videoHeight);

            const captureUrl = snapCanvas.toDataURL('image/jpeg', 0.85);
            setCaptureOverlay({ image: captureUrl, step: currentStep });
            
            if (currentStep === 1) {
              const p = (idx: number) => landmarks[idx];
              capturedImagesRef.current.front = captureUrl;
              capturedImagesRef.current.eyeLeft = { x: p(33).x, y: p(33).y };
              capturedImagesRef.current.eyeRight = { x: p(263).x, y: p(263).y };
              capturedImagesRef.current.faceLeft = { x: p(234).x, y: p(234).y };
              capturedImagesRef.current.faceRight = { x: p(454).x, y: p(454).y };
              capturedImagesRef.current.videoWidth = videoWidth;
              capturedImagesRef.current.videoHeight = videoHeight;
              setCapturedImages((prev) => ({ ...prev, front: captureUrl }));
            }
            
            scannerAudioRef.current?.playShutter(isMuted).catch(() => {});
            
            // Schedule the progression after the animated capture completes
            if (captureTimeoutRef.current) window.clearTimeout(captureTimeoutRef.current);
            captureTimeoutRef.current = window.setTimeout(() => {
               setCaptureOverlay(null);
               if (resultsBuffer.current.length >= 1) {
                 finishScanning();
               }
               poseHoldCounterRef.current = 0;
               isCapturingRef.current = false;
            }, 1000); // Wait 1.0 seconds for flash animation to finish
          }
        }

        // 0-LAG DOM METRICS UPDATE
        if (now - lastSampleAtRef.current >= 400 && !isCapturingRef.current) {
          const metrics = calculateFaceMetrics(landmarks, videoWidth, videoHeight, fps);
          resultsBuffer.current.push(metrics.shape as FaceShape);
          
          const ffEl = document.getElementById('metric-ff');
          if (ffEl) ffEl.innerText = (3500 + metrics.landmarks).toString();

          const logsContainer = document.getElementById('scan-logs');
          if (logsContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = 'text-white border-b border-zinc-900 py-1';
            logEntry.innerText = `> Pose: ${currentPose} | Target: ${targetPose} | Step: ${currentStep}`;
            logsContainer.prepend(logEntry);
            if (logsContainer.children.length > 5) {
              logsContainer.lastChild?.remove();
            }
          }
          
          lastSampleAtRef.current = now;
        }
      }
    }

    // Since we drew the mesh to canvasCtx for the snapshot, we want it to clear automatically next frame,
    // but the restore() handles context state. The clearRect at the top of onResults clears the pixels.
    canvasCtx.restore();
  };

  const finishScanning = () => {
    isScanningRef.current = false;
    scannerAudioRef.current?.stopScan();
    setPhase('PROCESSING');
    scannerAudioRef.current?.playProcessing(isMuted).catch(() => {});
    addLogLine(setSystemLogs, 'All poses complete. Running frame compatibility solver.');

    const counts: Partial<Record<FaceShape, number>> = {};
    let maxCount = 0;
    let bestShape: FaceShape = resultsBuffer.current[0] || 'Oval';
    resultsBuffer.current.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
      if ((counts[s] || 0) > maxCount) {
        maxCount = counts[s] || 0;
        bestShape = s;
      }
    });

    stopCamera();

    if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    processingTimeoutRef.current = window.setTimeout(() => {
      const confidence = ((maxCount / Math.max(1, resultsBuffer.current.length)) * 100).toFixed(1);
      setFinalResult({
        frontImage: capturedImagesRef.current.front || '/placeholder-face.png',
        shape: bestShape,
        confidence,
        lines: capturedImagesRef.current.lines,
        metrics: capturedImagesRef.current.metrics,
        eyeLeft: capturedImagesRef.current.eyeLeft,
        eyeRight: capturedImagesRef.current.eyeRight,
        faceLeft: capturedImagesRef.current.faceLeft,
        faceRight: capturedImagesRef.current.faceRight,
        videoWidth: capturedImagesRef.current.videoWidth,
        videoHeight: capturedImagesRef.current.videoHeight
      });
      setSelectedGlassesIndex(0);
      setPhase('RESULT');
      scannerAudioRef.current?.playComplete(isMuted).catch(() => {});
    }, 6500);
  };

  const handleReset = () => {
    stopAllSounds();
    stopCamera();
    if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    setFinalResult(null);
    setShowReport(false);
    setScanProgress(0);
    setScanMetrics(initialMetrics);
    setPhase('IDLE');
  };

  const renderStep = (step: (typeof calibrationSteps)[number]) => {
    const isActive = activeStep === step.id;

    return (
      <div
        key={step.id}
        className={`relative flex w-full max-w-[420px] flex-col justify-start rounded-[1.25rem] border p-4 transition-all duration-300 mx-auto min-h-[120px] xl:min-h-[140px] ${
          isActive
            ? 'border-2 border-[#38bdf8] bg-[#38bdf8]/5 shadow-[0_0_20px_rgba(74,222,128,0.15)] z-10'
            : 'border-zinc-800/60 bg-zinc-950/40 opacity-50'
        }`}
      >
        <h3 className={`text-lg xl:text-xl font-medium tracking-wide ${isActive ? 'text-white' : 'text-zinc-500'}`} style={{fontFamily: 'var(--font-kalam)'}}>
          {step.title}
        </h3>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-2">
          <div className="relative h-20 w-20 xl:h-24 xl:w-24">
            <img 
              src={step.image} 
              alt={step.title} 
              className={`h-full w-full object-contain mix-blend-screen ${isActive ? 'opacity-100 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'opacity-30 grayscale'}`} 
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#111111] font-sans text-zinc-100">
      <HiddenPreloader />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => setScriptsLoaded((prev) => ({ ...prev, mesh: true }))}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => setScriptsLoaded((prev) => ({ ...prev, drawing: true }))}
      />

      <div className="fixed bottom-6 left-6 z-[100]">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="rounded-full border border-zinc-800/70 bg-zinc-950/70 p-3 text-sky-300 backdrop-blur transition-colors hover:border-sky-500/40"
          aria-label={isMuted ? 'Unmute scanner audio' : 'Mute scanner audio'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <div
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-[#111111] transition-opacity duration-500 lg:flex lg:items-center lg:justify-center lg:overflow-hidden"
        style={{
          opacity: phase === 'SCANNING' || phase === 'PROCESSING' ? 1 : 0,
          pointerEvents: phase === 'SCANNING' || phase === 'PROCESSING' ? 'auto' : 'none',
          zIndex: phase === 'SCANNING' || phase === 'PROCESSING' ? 50 : -1,
        }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:grid lg:h-full lg:max-h-[96vh] lg:grid-cols-[260px_1fr_260px] xl:grid-cols-[320px_1fr_320px] lg:gap-6 p-2 pb-6 lg:p-6 xl:p-8">
          
          {/* Left Panel: Scan Instructions */}
          <aside className="hidden lg:flex h-full w-full flex-col justify-center gap-4 xl:gap-6">
            <div className="flex w-full flex-col gap-4 xl:gap-6">
              {calibrationSteps.map(renderStep)}
            </div>
          </aside>

          {/* Center Panel: Camera */}
          <section className="relative flex h-[82vh] lg:h-full w-full flex-col items-center justify-center p-2 lg:p-0">
            <div className="relative mx-auto aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] h-full max-h-[85vh] w-full max-w-[500px] overflow-hidden rounded-[2rem] bg-black shadow-[0_0_50px_rgba(56,189,248,0.12)] border border-[#38bdf8]/20">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="camera-beauty-filter contrast-[1.05] brightness-110 saturate-110 blur-[0.5px] absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-90"
              />
              {/* Canvas for processing */}
              <canvas
                ref={canvasRef}
                className="camera-beauty-filter contrast-[1.05] brightness-110 saturate-110 blur-[0.5px] pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-60"
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.6))] mix-blend-multiply" />
              <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full scale-x-[-1] object-cover" />

              {phase === 'SCANNING' && !isCapturingRef.current && (
                <button 
                  onClick={toggleCamera}
                  className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/40 border border-[#38bdf8]/30 text-[#38bdf8] hover:bg-black/60 transition-colors backdrop-blur-md"
                >
                  <SwitchCamera size={24} />
                </button>
              )}

              {phase === 'PROCESSING' && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden">
                  <img src={capturedImages.front || ''} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" alt="Analysis Target" />
                  <div className="absolute inset-0 bg-black/70 mix-blend-multiply" />
                  
                  {/* Laser Scanning Animation from top to bottom */}
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-[#38bdf8] shadow-[0_0_20px_rgba(163,230,53,1)]"
                    animate={{ top: ['-5%', '105%'] }}
                    transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-[#38bdf8]/20 to-transparent"
                    animate={{ top: ['-25%', '105%'] }}
                    transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
                  />

                  <div className="z-10 flex flex-col items-center bg-black/50 p-6 rounded-2xl backdrop-blur-md border border-[#38bdf8]/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <Loader2 className="h-12 w-12 animate-spin text-[#38bdf8]" />
                    <p className="mt-4 font-mono text-sm uppercase tracking-widest text-[#38bdf8]">Calculating Biometrics...</p>
                  </div>
                </div>
              )}

              {/* Mobile Instruction Overlay (Hidden on Desktop) */}
              {phase === 'SCANNING' && !captureOverlay && (
                <div className="absolute bottom-8 left-0 right-0 z-20 flex lg:hidden flex-col items-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`mobile-step-${activeStep}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex flex-col items-center"
                    >
                      <h2 
                        className="text-white text-2xl font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(163,230,53,0.8)]" 
                        style={{fontFamily: 'var(--font-kalam)'}}
                      >
                        {activeStep === 1 ? '1. Posisi Depan' : activeStep === 2 ? '2. Hadap Kiri' : '3. Hadap Kanan'}
                      </h2>
                      <div className="mt-2 h-40 w-40 opacity-90 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                        <img 
                          src={calibrationSteps[activeStep - 1].image} 
                          alt="Instruction" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              <AnimatePresence>
                {captureOverlay && (
                  <motion.div
                    key="capture-overlay"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center overflow-hidden"
                  >
                    <img src={captureOverlay.image} alt="Capture" className="absolute inset-0 w-full h-full object-cover opacity-90 scale-x-[-1]" />
                    <motion.div
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                      className="z-50 border border-sky-500/50 bg-black/60 px-6 py-3 backdrop-blur-md"
                    >
                      <span className="font-mono text-xl tracking-[0.3em] text-sky-400">BIOMETRIC ACQUIRED</span>
                    </motion.div>
                    
                    {/* Scanning Line effect on capture */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-1 bg-sky-300 shadow-[0_0_20px_rgba(110,231,183,1)]"
                      initial={{ top: '0%' }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 0.8, ease: 'linear' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Mobile Loading Bar (Hidden on Desktop) */}
          {phase === 'SCANNING' && (
            <div className="flex lg:hidden flex-col gap-2 w-full max-w-[500px] mx-auto px-4">
              <div className="flex justify-between items-end px-1" style={{fontFamily: 'var(--font-kalam)'}}>
                <span className="text-[#38bdf8] text-xl font-bold drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]">{scanProgress}%</span>
                <span className="text-zinc-400 text-xs tracking-widest uppercase">Processing</span>
              </div>
              <div className="h-3 w-full bg-black border border-zinc-800 rounded-full overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
                <motion.div 
                  className="h-full bg-[#38bdf8] rounded-full shadow-[0_0_15px_rgba(163,230,53,0.9)]"
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          )}

          {/* Right Panel: Session Metrics & Logs */}
          <aside className="hidden lg:flex h-full w-full flex-col justify-center gap-4 text-zinc-300 xl:gap-6">
            <div className="flex flex-col gap-4 xl:gap-6">
              <div className="flex justify-center">
                {/* Circular Progress */}
                <div className="relative h-32 w-32 xl:h-40 xl:w-40">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <motion.circle
                      id="scan-progress-circle"
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      animate={{ strokeDashoffset: circumference - (scanProgress / 100) * circumference }}
                      transition={{ duration: 0.4 }}
                      style={{ filter: 'drop-shadow(0 0 8px rgba(163,230,53,0.6))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{fontFamily: 'var(--font-kalam)'}}>
                    <span id="scan-progress-text" className="text-3xl xl:text-4xl text-white font-bold tracking-wider">{scanProgress}%</span>
                    <span className="text-[10px] xl:text-xs text-zinc-400">Complete</span>
                  </div>
                </div>
              </div>

              {/* Metrics Text */}
              <div className="flex flex-col gap-1 text-sm xl:gap-2 xl:text-base">
                <div>Facial Frame: <span id="metric-ff" className="text-white">3500</span></div>
                <div>Mode: <span className="text-white">w76-66B</span></div>
                <div>Analysis Mode: <span className="text-[#38bdf8]">Active</span></div>
                <div>Biometric Integrity: <span className="text-white">98%</span></div>
              </div>

              {/* Landmark Detection List Table */}
              <div className="border-t border-zinc-800 pt-3 text-[11px] xl:text-xs">
                <div className="mb-2 text-zinc-400 underline decoration-zinc-700 underline-offset-4">Facial Landmark Detection List</div>
                <div className="grid grid-cols-[40px_1fr_50px] gap-1 text-zinc-500">
                  <div>SSD.</div><div>Nevameries</div><div>Data</div>
                  <div>1</div><div className="text-white">Dut Nusi</div><div className="text-white">300</div>
                  <div>2</div><div className="text-white">Aliwa List</div><div className="text-white">320</div>
                  <div>3</div><div className="text-white">Desli</div><div className="text-white">783</div>
                  <div>4</div><div className="text-white">Dast Kero</div><div className="text-white">200</div>
                  <div>5</div><div className="text-white">Maorpra</div><div className="text-white">282</div>
                </div>
              </div>

              {/* Logs */}
              <div id="scan-logs" className="mt-2 flex flex-col gap-1 text-[10px] xl:text-[11px] text-zinc-500 font-mono h-24 overflow-hidden">
                <div className="text-white border-b border-zinc-900 py-1">{'>'} Engine initialized...</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'IDLE' && (
          <motion.div
            key="hero"
            exit={{ opacity: 0, filter: 'blur(20px)' }}
            transition={{ duration: 0.8 }}
            className="relative z-40"
          >
            <Hero onStart={handleStartScan} />
            {isInitializing && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md">
                <div className="flex flex-col items-center gap-8">
                  <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_0_40px_rgba(163,230,53,0.05)]">
                    <ScanFace className="h-16 w-16 text-zinc-700" strokeWidth={1} />
                    
                    {/* Scanning Laser Line */}
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 bg-[#38bdf8] shadow-[0_0_20px_rgba(163,230,53,1)]"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    {/* Glowing overlay */}
                    <motion.div
                      className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-[#38bdf8]/10 to-transparent"
                      animate={{ top: ['-50%', '100%', '-50%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="text-xl font-medium tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                      {engineReady ? 'Mempersiapkan Kamera...' : 'Menyiapkan Pemindai Wajah...'}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Mohon tunggu sebentar
                    </span>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'PROCESSING' && capturedImages && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0a0a0a] p-6"
          >
            <div className="flex w-full max-w-4xl flex-col items-center gap-8">
              <div className="w-full text-left">
                <p className="font-mono text-sm uppercase tracking-widest text-sky-400">Biometric Profile: <span className="text-white">Analyzed</span></p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-zinc-500">{'<'}</span>
                  <span className="font-medium tracking-wide text-zinc-200">Face Scanning & Customizing</span>
                </div>
              </div>
              
              <div className="relative flex w-full justify-center">
                {/* Image Container */}
                <div className="relative h-64 w-full max-w-md overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl lg:h-96 border border-zinc-800">
                  {capturedImages.front && (
                    <img src={capturedImages.front} alt="Front" className="h-full w-full object-cover" />
                  )}
                  {/* Sweeping Laser Animation */}
                  <motion.div
                    className="pointer-events-none absolute left-0 right-0 h-1 bg-sky-400 shadow-[0_0_20px_rgba(16,185,129,1)]"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                  />
                </div>
              </div>

              {/* AI Analyzer Orb & Floating Metrics */}
              <div className="relative mt-2 flex flex-col items-center w-full max-w-md">
                <p className="text-sm text-zinc-300 mb-8 font-medium tracking-wide">Matching suitable frames based on facial information...</p>
                
                <div className="relative flex items-center justify-center w-full h-48">
                  {/* Glowing AI Orb */}
                  <AILiquidOrb />
                  
                  {/* Floating Process Labels */}
                  <div className="absolute inset-0 z-0">
                    <ProcessLabel text="Biometric Mapping" delay={0} className="top-2 left-0" />
                    <ProcessLabel text="Nasal Bridge Depth" delay={800} className="top-6 right-0" />
                    <ProcessLabel text="Pupillary Distance" delay={1600} className="top-20 left-0 -ml-8" />
                    <ProcessLabel text="Jawline Contours" delay={2400} className="bottom-8 left-2" />
                    <ProcessLabel text="Ocular Spacing" delay={3200} className="top-16 right-0 -mr-6" />
                    <ProcessLabel text="Facial Symmetry" delay={4000} className="bottom-8 right-2" />
                    <ProcessLabel text="Frame Compatibility" delay={4800} className="bottom-0 right-1/4" />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex w-full max-w-lg flex-col items-center gap-3">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    className="h-full bg-sky-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 6.5, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'ERROR' && (
          <motion.div key="error" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-6">
            <div className="w-full max-w-md border border-red-500/30 bg-red-950/10 p-10 text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h2 className="mb-2 text-2xl font-light uppercase tracking-[0.18em] text-zinc-100">System Error</h2>
              <p className="mb-8 text-sm text-zinc-500">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full border border-zinc-800 bg-zinc-950 py-3 font-mono text-xs uppercase tracking-[0.22em] text-zinc-200 transition-colors hover:border-sky-500/40"
              >
                Reload System
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'TRY_ON' && finalResult && !showReport && (
          <motion.div
            key="tryon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-[70] min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4 lg:p-8 py-10"
          >
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38bdf8]/5 blur-[120px] transition-opacity duration-1000" />
            </div>
            <div className="w-full max-w-4xl text-left mb-6">
              <p className="font-mono text-sm uppercase tracking-widest text-sky-400">AI Eyewear Reco & Try-on</p>
              <div className="mt-2 flex items-center gap-2 cursor-pointer" onClick={handleReset}>
                <span className="text-zinc-500">{'<'}</span>
                <span className="font-medium tracking-wide text-zinc-200">Restart Session</span>
              </div>
            </div>

            <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 bg-[#111] p-6 lg:p-10 rounded-3xl border border-sky-500/30 shadow-[0_0_40px_rgba(14,165,233,0.1)]">
              {/* Info Panel */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="flex items-center gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                  <div className="w-24 h-24 bg-zinc-200 rounded-2xl overflow-hidden shrink-0 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] relative">
                    <img src={resultData.recs[selectedGlassesIndex].img} className="w-full h-auto object-contain drop-shadow-sm" alt="Glasses" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-sky-400 leading-tight mb-1">{resultData.recs[selectedGlassesIndex].name}</h3>
                    <div className="text-xs text-zinc-400 font-mono">Shape: {finalResult.shape} Match</div>
                  </div>
                </div>
                <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 flex-1">
                  <h4 className="text-sm font-bold tracking-widest uppercase text-zinc-400 mb-3">AI Selection Reason</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {resultData.recs[selectedGlassesIndex].reason}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowReport(true)}
                    className="w-full py-4 rounded-xl bg-sky-500 text-white font-bold tracking-wider hover:bg-sky-400 transition-colors shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                  >
                    PRINT REPORT
                  </button>
                </div>
              </div>
              
              {/* Try On View */}
              <div className="w-full lg:w-2/3 flex flex-col items-center">
                <div className={`relative w-full max-w-sm aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-zinc-800 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}>
                  <img src={finalResult.frontImage} className="w-full h-full object-cover camera-beauty-filter contrast-[1.05] brightness-110 saturate-110 blur-[0.5px]" alt="User Face" />
                  {/* Absolute positioning for Glasses overlay with accurate alignment */}
                  {finalResult.videoWidth && finalResult.videoHeight && (
                    <svg viewBox={`0 0 ${finalResult.videoWidth} ${finalResult.videoHeight}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full z-10">
                      {finalResult.eyeLeft && finalResult.eyeRight && finalResult.faceLeft && finalResult.faceRight && (() => {
                        // Coordinates are already mapped to 1 - x
                        const eyeMidX = (finalResult.eyeLeft.x + finalResult.eyeRight.x) / 2;
                        const eyeMidY = (finalResult.eyeLeft.y + finalResult.eyeRight.y) / 2;
                        const faceW = Math.abs(finalResult.faceRight.x - finalResult.faceLeft.x);
                        
                        const glassW = faceW * 1.85 * finalResult.videoWidth; // Scale by video width
                        const glassH = glassW * 0.45; // Aspect ratio of glasses
                        const absX = eyeMidX * finalResult.videoWidth;
                        const absY = eyeMidY * finalResult.videoHeight;
                        
                        return (
                          <image 
                            href={resultData.recs[selectedGlassesIndex].img} 
                            x={absX - glassW / 2} 
                            y={absY - glassH / 2} 
                            width={glassW} 
                            height={glassH} 
                          />
                        );
                      })()}
                    </svg>
                  )}
                </div>
                
                {/* Carousel */}
                <div className="mt-6 w-full max-w-sm">
                  <h4 className="text-xs font-bold text-center uppercase tracking-widest text-zinc-500 mb-3">Recommended Frames</h4>
                  <div className="flex justify-center gap-3 overflow-x-auto pb-2 pt-3 px-3" style={{ scrollbarWidth: 'none' }}>
                    {resultData.recs.map((rec, i) => (
                      <div 
                        key={i}
                        onClick={() => setSelectedGlassesIndex(i)}
                        className={`relative w-20 h-20 shrink-0 rounded-xl cursor-pointer transition-all duration-300 p-2 flex items-center justify-center ${
                          selectedGlassesIndex === i 
                          ? 'bg-zinc-100 border-2 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]' 
                          : 'bg-zinc-300 border border-transparent opacity-70 hover:opacity-100 hover:bg-zinc-200'
                        }`}
                      >
                        {selectedGlassesIndex === i && (
                          <div className="absolute -top-2 -right-2 bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                            {rec.score}%
                          </div>
                        )}
                        <img src={rec.img} className="w-full h-auto object-contain drop-shadow-sm" alt={rec.name} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'RESULT' && finalResult && !showReport && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-40 min-h-screen bg-[#0d0d0d] px-4 py-8 lg:px-8 lg:py-12 flex flex-col items-center justify-center"
          >
            <div className="w-full max-w-4xl text-left mb-6">
              <p className="font-mono text-sm uppercase tracking-widest text-sky-400">Biometric Profile: <span className="text-white">Analyzed</span></p>
              <div className="mt-2 flex items-center gap-2 cursor-pointer" onClick={handleReset}>
                <span className="text-zinc-500">{'<'}</span>
                <span className="font-medium tracking-wide text-zinc-200">Face Scanning & Customizing</span>
              </div>
            </div>

            <div className="w-full max-w-4xl rounded-3xl border border-sky-500/30 p-6 lg:p-10 shadow-[0_0_40px_rgba(16,185,129,0.05)] bg-[#111]">
              
              {/* Images with Overlays */}
              <div className="flex justify-center mb-10">
                <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-zinc-800">
                  <img src={finalResult.frontImage} alt="Front" className="w-full h-full object-cover" />
                  {/* Measurement Overlays */}
                  {finalResult.lines.map((line, i) => (
                    <div 
                      key={i} 
                      className="absolute h-[2px] bg-red-500 shadow-[0_0_8px_red]" 
                      style={{ top: line.top, left: line.left, width: line.width }} 
                    />
                  ))}
                  <div className="absolute top-[10%] bottom-[10%] left-1/2 w-px bg-sky-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2">Your Exclusive Facial Parameters</h2>
                <p className="text-zinc-500 text-sm tracking-wide">AI Biometric Recognition Engine • Precise Capture</p>
              </div>

              <div className="flex justify-center gap-4 mb-10">
                <span className="px-6 py-1.5 rounded-full border border-sky-500/50 text-sky-400 font-medium">Round</span>
                <span className="px-6 py-1.5 rounded-full bg-sky-500 text-white font-medium">{finalResult.shape}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 max-w-2xl mx-auto mb-12">
                {Object.entries(finalResult.metrics).map(([key, val], i) => (
                  <div key={key} className="flex items-center gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <span className="flex shrink-0 items-center justify-center w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold">{i + 1}</span>
                    <span className="text-zinc-300 text-sm">{key}</span>
                    <span className="ml-auto text-sky-50 font-mono">{val}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase('TRY_ON')}
                className="w-full max-w-md mx-auto block py-4 rounded-xl bg-sky-500 text-white font-semibold text-lg hover:bg-sky-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                VIRTUAL TRY-ON
              </button>
            </div>
          </motion.div>
        )}

        {(phase === 'RESULT' || phase === 'TRY_ON') && finalResult && showReport && (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-40 min-h-screen bg-[#f4f6f8] print:bg-white text-black px-4 py-10 lg:px-8 print:p-0 flex flex-col items-center"
          >
            <div id="print-report-container" className="w-full max-w-4xl bg-white rounded-3xl shadow-xl print:shadow-none print:border-none overflow-hidden border border-zinc-200">
              {/* Report Header */}
              <div className="px-8 py-6 border-b border-zinc-200 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sky-600 font-bold text-xl cursor-pointer uppercase tracking-widest" onClick={() => setShowReport(false)}>
                    Optik Brightstone
                  </div>
                  <button onClick={handleReset} className="text-zinc-500 hover:text-black print:hidden">
                    <Power size={20} />
                  </button>
                </div>
                <h1 className="text-3xl font-bold text-zinc-800 mb-6">Face Scan & Custom Frame Report</h1>
                
                <div className="w-full flex justify-between text-sm text-zinc-600 border-t border-zinc-200 pt-4 px-4">
                  <div>Order #: <span className="text-black ml-2 font-mono">{Math.floor(Math.random() * 900000) + 100000}</span></div>
                  <div>Store: <span className="text-black ml-2">Optik Brightstone Center</span></div>
                  <div>Date: <span className="text-black ml-2 font-mono">{new Date().toISOString().split('T')[0]}</span></div>
                </div>
                <div className="w-full flex justify-between text-sm text-zinc-600 px-4 mt-2">
                  <div>Analysis ID: <span className="text-black ml-2 font-mono">BIO-{Math.floor(Math.random() * 9000) + 1000}</span></div>
                  <div>System: <span className="text-black ml-2">AI-MediScan V2</span></div>
                  <div>Accuracy: <span className="text-sky-600 ml-2 font-mono">98.4%</span></div>
                </div>
              </div>

              {/* AI Face Shape Analysis */}
              <div className="px-10 py-8 border-b border-zinc-200">
                <h3 className="text-lg font-bold text-zinc-800 border-l-4 border-sky-500 pl-3 mb-6">AI Face Shape Analysis</h3>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-1/3 text-center md:text-left">
                    <h4 className="text-2xl font-bold text-sky-600 mb-2">{finalResult.shape}</h4>
                    <p className="text-sm text-zinc-500 mb-4">Biometric Scan Complete</p>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {finalResult.shape === 'Oval' && 'Proportions are balanced with gently rounded contours. Highly versatile for most frame shapes.'}
                      {finalResult.shape === 'Round' && 'Full, rounded face with soft lines. Lacks strong angularity. Angular frames will add definition.'}
                      {finalResult.shape === 'Square' && 'Strong jawline with a broad forehead. Features are angular and well-defined. Soft, rounded frames balance the structure.'}
                      {finalResult.shape === 'Heart' && 'Wider forehead tapering down to a narrow chin. Bottom-heavy frames balance the upper face width.'}
                      {finalResult.shape === 'Oblong' && 'Face is notably longer than it is wide. Tall frames help break up the length.'}
                    </p>
                  </div>
                  <div className={`w-32 h-40 shrink-0 rounded-lg overflow-hidden border-2 border-sky-500 p-1 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}>
                    <img src={finalResult.frontImage} className="w-full h-full object-cover rounded" alt="Face ID" />
                  </div>
                  <div className="w-full md:w-auto flex-1 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {Object.entries(finalResult.metrics).slice(0, 6).map(([key, val], i) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className="w-4 h-4 shrink-0 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-[10px] font-bold">{i + 1}</div> 
                        <span className="text-zinc-500 truncate">{key}</span> 
                        <span className="font-mono ml-auto font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(() => {
                const faceW = parseFloat(finalResult.metrics['Face Width']) || 140;
                const recs = getRecommendations(finalResult.shape);
                const bridge = 18;
                const totalW = Math.round(faceW - 2);
                const lensW = Math.round((totalW - bridge - 12) / 2);
                const temple = totalW > 140 ? 145 : 140;
                const bend = Math.round(temple * 0.7);
                return (
                  <>
              {/* Reco Frame Size Range */}
              <div className="px-10 py-8 border-b border-zinc-200">
                <h3 className="text-lg font-bold text-zinc-800 border-l-4 border-sky-500 pl-3 mb-6">Reco Frame Size Range</h3>
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-full md:w-1/3">
                    {/* Minimalist Glasses Schematic */}
                    <svg viewBox="0 0 200 100" className="w-full h-auto stroke-sky-500 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="20" y="20" width="70" height="40" rx="10" />
                      <rect x="110" y="20" width="70" height="40" rx="10" />
                      <path d="M90 40 Q100 30 110 40" />
                      <path d="M20 30 L5 20 M180 30 L195 20" />
                      {/* Dimension lines */}
                      <path d="M20 70 L90 70" strokeWidth="1" strokeDasharray="4 4" className="stroke-zinc-400" />
                      <text x="55" y="85" fontSize="10" className="fill-zinc-500 stroke-none" textAnchor="middle">Lens</text>
                      <path d="M90 50 L110 50" strokeWidth="1" strokeDasharray="4 4" className="stroke-zinc-400" />
                      <text x="100" y="65" fontSize="10" className="fill-zinc-500 stroke-none" textAnchor="middle">Bridge</text>
                    </svg>
                  </div>
                  <div className="w-full md:w-2/3 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div className="flex justify-between items-center bg-zinc-50 p-2 rounded"><span className="text-zinc-500"><span className="text-sky-500 font-bold mr-2">1</span>Bridge Width</span><span className="font-mono font-medium">{bridge} ± 2mm</span></div>
                    <div className="flex justify-between items-center bg-zinc-50 p-2 rounded"><span className="text-zinc-500"><span className="text-sky-500 font-bold mr-2">2</span>Bend Point Length</span><span className="font-mono font-medium">{bend} ± 5mm</span></div>
                    <div className="flex justify-between items-center bg-zinc-50 p-2 rounded"><span className="text-zinc-500"><span className="text-sky-500 font-bold mr-2">3</span>Lens Width</span><span className="font-mono font-medium">{lensW} ± 2mm</span></div>
                    <div className="flex justify-between items-center bg-zinc-50 p-2 rounded"><span className="text-zinc-500"><span className="text-sky-500 font-bold mr-2">4</span>Reco Temple Length</span><span className="font-mono font-medium">{temple} mm</span></div>
                    <div className="flex justify-between items-center bg-zinc-50 p-2 rounded col-span-2"><span className="text-zinc-500"><span className="text-sky-500 font-bold mr-2">5</span>Total Frame Width</span><span className="font-mono font-medium">{totalW} ± 5mm</span></div>
                  </div>
                </div>
              </div>

              {/* AI Frame Reco & Avoidance Guide */}
              <div className="px-10 py-8 bg-zinc-50">
                <h3 className="text-lg font-bold text-zinc-800 border-l-4 border-sky-500 pl-3 mb-6">AI Frame Reco & Avoidance Guide</h3>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <h4 className="text-sm font-bold text-zinc-600 mb-4">Reco Frames</h4>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="px-4 py-2 bg-sky-500 text-white rounded text-sm font-medium">Shape</div>
                      <div className="px-4 py-2 border border-zinc-200 rounded text-sm text-zinc-700 bg-zinc-50">{recs.reco.shapes}</div>
                    </div>
                    <p className="text-xs text-sky-600">{recs.reco.desc}</p>
                  </div>
                  <div className="flex-1 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <h4 className="text-sm font-bold text-zinc-600 mb-4">Frames to Avoid</h4>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="px-4 py-2 bg-sky-500 text-white rounded text-sm font-medium">Shape</div>
                      <div className="px-4 py-2 border border-zinc-200 rounded text-sm text-zinc-700 bg-zinc-50">{recs.avoid.shapes}</div>
                    </div>
                    <p className="text-xs text-red-500">{recs.avoid.desc}</p>
                  </div>
                </div>
              </div>
                  </>
                );
              })()}

              {/* Buttons */}
              <div className="px-10 py-6 bg-white flex gap-4 print:hidden">
                <button onClick={() => setShowReport(false)} className="flex-1 py-4 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors">BACK TO TRY-ON</button>
                <button 
                  onClick={async () => {
                    try {
                      const element = document.getElementById('print-report-container');
                      if (!element) return;
                      // @ts-ignore
                      const html2pdfModule = await import('html2pdf.js');
                      const html2pdf = html2pdfModule.default ? html2pdfModule.default : html2pdfModule;
                      const opt = {
                        margin:       [0, 0, 0, 0],
                        filename:     'Optik_Brightstone_Report.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                      };
                      const buttonsContainer = element.querySelector('.print\\\\:hidden');
                      if (buttonsContainer) (buttonsContainer as HTMLElement).style.display = 'none';
                      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
                      if (buttonsContainer) (buttonsContainer as HTMLElement).style.display = 'flex';
                      
                      const file = new File([pdfBlob], "Optik_Brightstone_Report.pdf", { type: "application/pdf" });
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          title: 'Optik Brightstone Face Scan Report',
                          text: 'Here is my Face Scan and Custom Frame Report from Optik Brightstone!',
                          files: [file]
                        });
                      } else {
                        html2pdf().set(opt).from(element).save();
                      }
                    } catch (err) {
                      console.error("Error sharing PDF:", err);
                      window.print();
                    }
                  }}
                  className="flex-1 py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors flex items-center justify-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  SHARE NOW
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
