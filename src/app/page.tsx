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
} from 'lucide-react';
import GlassesCard from '@/components/GlassesCard';
import Hero from '@/components/Hero';
import ScannerHUD from '@/components/ScannerHUD';
import { createScannerAudioController, type ScannerAudioController } from '@/lib/scannerAudio';

type GlassesModel = { name: string; img: string; reason: string; score: number };
type FaceShape = 'Oval' | 'Round' | 'Square' | 'Heart' | 'Oblong';
type GlassesCategory = {
  title: string;
  desc: string;
  stats: { jaw: string; cheek: string; ratio: string };
  recs: GlassesModel[];
};
type Phase = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'RESULT' | 'ERROR';
type ActiveStep = 1 | 2 | 3;
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
      { name: 'Wayfarer Bold', img: '/glasses/Wayfarer eyeglasses.webp', reason: 'Ketebalan frame memberikan definisi instan pada garis pipi Anda.', score: 94 },
      { name: 'Shield Tech', img: '/glasses/Shield Sunglasses.webp', reason: 'Garis lurus visor memotong kebulatan wajah secara estetik.', score: 89 },
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
      { name: 'Shield Oversized', img: '/glasses/Shield Sunglasses.webp', reason: 'Menutupi area tengah wajah untuk memotong vertikalitas secara visual.', score: 97 },
      { name: 'Aviator Wide', img: '/glasses/Aviator eyeglasses.webp', reason: 'Bentuk melebar ke samping memberikan keseimbangan proporsi.', score: 94 },
      { name: 'Rectangular', img: '/glasses/Rectangular eyeglasses.webp', reason: 'Menambah dimensi horizontal secara signifikan.', score: 91 },
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
    title: '1. Posisi Depan',
    image: '/hadapdepan1.png',
  },
  {
    id: 2 as ActiveStep,
    title: '2. Hadap Kiri',
    image: '/hadapkiri1.png',
  },
  {
    id: 3 as ActiveStep,
    title: '3. Hadap Kanan',
    image: '/hadapkanan1.png',
  },
];

const HiddenPreloader = () => {
  const allImages = Object.values(GLASSES_DB).flatMap((category) => category.recs.map((rec) => rec.img));
  const instructionImages = ['/hadapdepan1.png', '/hadapkiri1.png', '/hadapkanan1.png'];

  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      {[...allImages, ...instructionImages].map((src, i) => (
        <img key={i} src={src} alt="preload" loading="eager" />
      ))}
    </div>
  );
};

const getActiveStep = (progress: number): ActiveStep => {
  if (progress < 33) return 1;
  if (progress < 66) return 2;
  return 3;
};

const getScanStatus = (progress: number) => {
  if (progress < 33) return 'COMPUTING FRONTAL CRANIAL MESH';
  if (progress < 66) return 'SAGITTAL TEMPORAL CALIBRATION';
  return 'VERIFYING MANDIBULAR ARC';
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
  const [finalResult, setFinalResult] = useState<ScanResult | null>(null);
  const [captureOverlay, setCaptureOverlay] = useState<{ image: string, step: number } | null>(null);

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

  const startCamera = async () => {
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
          facingMode: 'user',
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

  const initFaceMesh = async () => {
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
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      await startCamera();
    } catch (e) {
      console.error('AI Error:', e);
      setErrorMessage('Gagal memuat AI Engine. Periksa koneksi internet.');
      setPhase('ERROR');
      setIsInitializing(false);
    }
  };

  const handleStartScan = async () => {
    unlockAudioContext();
    stopAllSounds();
    if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    await initFaceMesh();
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
        } else {
          poseHoldCounterRef.current = 0; // Reset completely if pose is lost for strict snapshot
        }

        // SNAPSHOT LOGIC: Once pose held for ~20 frames, trigger capture
        if (poseHoldCounterRef.current >= 20) {
          isCapturingRef.current = true;
          
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
            snapCtx.drawImage(canvasRef.current, 0, 0);

            const captureUrl = snapCanvas.toDataURL('image/jpeg', 0.85);
            setCaptureOverlay({ image: captureUrl, step: currentStep });
            scannerAudioRef.current?.triggerPulse(isMuted).catch(() => {});
            
            // Schedule the progression after the animated capture completes
            if (captureTimeoutRef.current) window.clearTimeout(captureTimeoutRef.current);
            captureTimeoutRef.current = window.setTimeout(() => {
               setCaptureOverlay(null);
               if (currentStep === 1) {
                 setScanProgress(33);
                 activeStepRef.current = 2;
               } else if (currentStep === 2) {
                 setScanProgress(66);
                 activeStepRef.current = 3;
               } else if (currentStep === 3) {
                 setScanProgress(100);
                 if (resultsBuffer.current.length >= 5) {
                   finishScanning();
                 }
               }
               poseHoldCounterRef.current = 0;
               isCapturingRef.current = false;
            }, 3000); // Wait 3.0 seconds for animation to finish
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

    let snapshotUrl = '/placeholder-face.png';
    if (videoRef.current) {
      try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = videoRef.current.videoWidth;
        snapCanvas.height = videoRef.current.videoHeight;
        const ctx = snapCanvas.getContext('2d');
        if (ctx) {
          ctx.translate(snapCanvas.width, 0);
          ctx.scale(-1, 1);
          ctx.filter = 'brightness(1.18) contrast(1.05) saturate(1.08) blur(0.35px)';
          ctx.drawImage(videoRef.current, 0, 0);
          snapshotUrl = snapCanvas.toDataURL('image/jpeg', 0.85);
        }
      } catch {
        // Snapshot fallback remains safe.
      }
    }

    stopCamera();

    if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    processingTimeoutRef.current = window.setTimeout(() => {
      const confidence = Math.round((maxCount / resultsBuffer.current.length) * 100) || 92;
      setFinalResult({ shape: bestShape, image: snapshotUrl, confidence });
      setPhase('RESULT');
      playResultSound();
    }, PROCESSING_DELAY_MS);
  };

  const handleReset = () => {
    stopAllSounds();
    stopCamera();
    if (processingTimeoutRef.current !== null) window.clearTimeout(processingTimeoutRef.current);
    setFinalResult(null);
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
            ? 'border-2 border-[#4ade80] bg-[#4ade80]/5 shadow-[0_0_20px_rgba(74,222,128,0.15)] z-10'
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
    <main className="relative min-h-screen overflow-hidden bg-[#111111] font-sans text-zinc-100">
      <HiddenPreloader />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => setScriptsLoaded((prev) => ({ ...prev, mesh: true }))}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => setScriptsLoaded((prev) => ({ ...prev, drawing: true }))}
      />

      <div className="fixed bottom-6 left-6 z-[100]">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="rounded-full border border-zinc-800/70 bg-zinc-950/70 p-3 text-emerald-300 backdrop-blur transition-colors hover:border-emerald-500/40"
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
            <div className="relative mx-auto aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] h-full max-h-[85vh] w-full max-w-[500px] overflow-hidden rounded-[2rem] bg-black shadow-[0_0_50px_rgba(163,230,53,0.12)] border border-[#a3e635]/20">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="camera-beauty-filter absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-90"
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.6))] mix-blend-multiply" />
              <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full scale-x-[-1] object-cover" />

              {phase === 'PROCESSING' && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/[0.85] backdrop-blur-md">
                  <Loader2 className="h-16 w-16 animate-spin text-[#a3e635]" />
                  <p className="mt-4 font-mono text-sm uppercase tracking-widest text-[#a3e635]">Solving frame...</p>
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
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="z-50 text-6xl font-bold text-[#a3e635] tracking-widest drop-shadow-[0_0_25px_rgba(163,230,53,1)]"
                      style={{fontFamily: 'var(--font-kalam)'}}
                    >
                      DONE!
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Mobile Loading Bar (Hidden on Desktop) */}
          {phase === 'SCANNING' && (
            <div className="flex lg:hidden flex-col gap-2 w-full max-w-[500px] mx-auto px-4">
              <div className="flex justify-between items-end px-1" style={{fontFamily: 'var(--font-kalam)'}}>
                <span className="text-[#a3e635] text-xl font-bold drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]">{scanProgress}%</span>
                <span className="text-zinc-400 text-xs tracking-widest uppercase">Processing</span>
              </div>
              <div className="h-3 w-full bg-black border border-zinc-800 rounded-full overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
                <motion.div 
                  className="h-full bg-[#a3e635] rounded-full shadow-[0_0_15px_rgba(163,230,53,0.9)]"
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
                      stroke="#a3e635"
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
                <div>Analysis Mode: <span className="text-[#a3e635]">Active</span></div>
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
                      className="absolute left-0 right-0 h-0.5 bg-[#a3e635] shadow-[0_0_20px_rgba(163,230,53,1)]"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    {/* Glowing overlay */}
                    <motion.div
                      className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-[#a3e635]/10 to-transparent"
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

        {phase === 'ERROR' && (
          <motion.div key="error" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-6">
            <div className="w-full max-w-md border border-red-500/30 bg-red-950/10 p-10 text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h2 className="mb-2 text-2xl font-light uppercase tracking-[0.18em] text-zinc-100">System Error</h2>
              <p className="mb-8 text-sm text-zinc-500">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full border border-zinc-800 bg-zinc-950 py-3 font-mono text-xs uppercase tracking-[0.22em] text-zinc-200 transition-colors hover:border-emerald-500/40"
              >
                Reload System
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'RESULT' && finalResult && resultData && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-40 min-h-screen bg-[#0d0d0d] px-4 py-10 lg:px-8 lg:py-16"
          >
            <div className="mx-auto max-w-6xl">
              
              {/* Top Section: Integrated Face Shape & Recommendations Header */}
              <div className="mb-10 text-center">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white"
                >
                  Bentuk Wajah Anda: <span className="text-[#a3e635] drop-shadow-[0_0_25px_rgba(163,230,53,0.4)]">{resultData.title.split(' ')[0]}</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mx-auto max-w-3xl text-lg lg:text-xl leading-relaxed text-zinc-400"
                >
                  {resultData.desc}
                </motion.p>
              </div>

              {/* Bottom Section: Recommendations Grid */}
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="mb-8 text-center">
                  <h2 className="text-xl font-medium tracking-wide text-zinc-300">Rekomendasi Kacamata Terbaik Untuk Anda</h2>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {resultData.recs.map((item, index) => (
                    <GlassesCard
                      key={item.name}
                      name={item.name}
                      img={item.img}
                      desc={item.reason}
                      matchScore={item.score}
                      index={index}
                      isPrimary={index === 0}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={handleReset}
                className="mx-auto mt-16 flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 font-mono text-sm tracking-wider text-zinc-300 transition-colors hover:border-[#a3e635] hover:text-[#a3e635]"
              >
                <Power size={16} /> Scan Ulang Wajah
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
