"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Brain,
  Activity,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
  Video,
  Mic,
  MicOff,
} from "lucide-react";

// ── API Config ─────────────────────────────────────────────────
const FACE_API_BASE   = process.env.NEXT_PUBLIC_EMOTION_API_URL  ?? "http://localhost:8000";
const SPEECH_API_BASE = process.env.NEXT_PUBLIC_SPEECH_API_URL   ?? "http://localhost:8001";

const FACE_INTERVAL_MS   = 250;   // face frame every 250ms
const SPEECH_INTERVAL_MS = 5000;  // speech analysis every 5s
const SPEECH_CHUNK_MS    = 4000;  // record 4s of audio per chunk

// ── Emotion display maps ───────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  happy:   "bg-yellow-500",
  neutral: "bg-gray-400",
  sad:     "bg-blue-500",
  angry:   "bg-red-500",
  fear:    "bg-purple-500",
  disgust: "bg-green-600",
  surprise:"bg-cyan-400",
  unknown: "bg-gray-600",
};

const EMOTION_BADGE: Record<string, string> = {
  happy:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  neutral: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  sad:     "bg-blue-500/20 text-blue-300 border-blue-500/40",
  angry:   "bg-red-500/20 text-red-300 border-red-500/40",
  fear:    "bg-purple-500/20 text-purple-300 border-purple-500/40",
  disgust: "bg-green-500/20 text-green-300 border-green-500/40",
  surprise:"bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  unknown: "bg-gray-700/20 text-gray-400 border-gray-700/40",
};

const EMOTION_EMOJI: Record<string, string> = {
  happy:"😊", neutral:"😐", sad:"😢", angry:"😠",
  fear:"😨", disgust:"🤢", surprise:"😲", unknown:"🤔",
};

const TIPS_DATA = [
  { title: "🧘 Practice Mindfulness",  desc: "Spend 10–15 minutes daily focusing on your breath. It reduces stress and improves focus." },
  { title: "😴 Maintain Sleep Routine", desc: "Aim for 7–8 hours of sleep. A consistent sleep cycle improves mood and brain function." },
  { title: "🚶 Stay Physically Active", desc: "Light exercise like walking or stretching releases endorphins and reduces anxiety." },
  { title: "📵 Digital Detox",          desc: "Take breaks from screens and social media to reduce mental fatigue." },
  { title: "🗣 Talk to Someone",        desc: "Sharing feelings with friends or family helps relieve emotional pressure." },
  { title: "🎯 Set Small Goals",        desc: "Completing small tasks builds motivation and gives a sense of achievement." },
];

// ── Types ──────────────────────────────────────────────────────
interface EmotionResponse {
  face_detected:       boolean;
  emotion:             string;
  confidence:          number;
  scores:              Record<string, number>;
  mental_health_score: number;
  session_dominant:    string;
}

interface SpeechResponse {
  emotion:       string;
  confidence:    number;
  transcript:    string;
  sentiment:     string;
  emotionScores: Record<string, number>;
  stressScore?:  number;
}

// ── WAV encoder (converts float32 PCM → WAV ArrayBuffer) ──────
function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number): ArrayBuffer {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign    = numChannels * bytesPerSample;
  const byteRate      = sampleRate * blockAlign;
  const dataSize      = samples.length * bytesPerSample;
  const buffer        = new ArrayBuffer(44 + dataSize);
  const view          = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0,  "RIFF");
  view.setUint32( 4, 36 + dataSize,        true);
  writeStr(8,  "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16,                   true); // PCM chunk size
  view.setUint16(20, 1,                    true); // PCM format
  view.setUint16(22, numChannels,          true);
  view.setUint32(24, sampleRate,           true);
  view.setUint32(28, byteRate,             true);
  view.setUint16(32, blockAlign,           true);
  view.setUint16(34, bitsPerSample,        true);
  writeStr(36, "data");
  view.setUint32(40, dataSize,             true);

  // Convert float32 → int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

// ── Component ──────────────────────────────────────────────────
export function LiveDetection() {
  type ViewMode = "tips" | "camera" | "results";

  // View
  const [viewMode,   setViewMode]  = useState<ViewMode>("tips");
  const [activeTip,  setActiveTip] = useState<number | null>(null);

  // Face state
  const [isDetecting,      setIsDetecting]      = useState(false);
  const [isCameraReady,    setIsCameraReady]    = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [result,           setResult]           = useState<EmotionResponse | null>(null);
  const [finalResult,      setFinalResult]      = useState<EmotionResponse | null>(null);
  const [apiError,         setApiError]         = useState<string | null>(null);
  const [fps,              setFps]              = useState(0);

  // Speech state
  const [speechResult,      setSpeechResult]      = useState<SpeechResponse | null>(null);
  const [finalSpeechResult, setFinalSpeechResult] = useState<SpeechResponse | null>(null);
  const [isMicReady,        setIsMicReady]        = useState(false);
  const [isRecording,       setIsRecording]       = useState(false);
  const [speechError,       setSpeechError]       = useState<string | null>(null);

  // Face refs
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsCountRef = useRef(0);
  const fpsTimerRef = useRef(Date.now());

  // Speech refs
  const audioStreamRef    = useRef<MediaStream | null>(null);
  const speechIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef     = useRef(0);
  const audioChunksRef    = useRef<Blob[]>([]);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);

  // Assign srcObject after <video> mounts
  useEffect(() => {
    if (viewMode === "camera" && isCameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Video play error:", err);
        setApiError("Could not start video playback.");
      });
    }
  }, [isCameraReady, viewMode]);

  // ── Mic start ─────────────────────────────────────────────
  const startMic = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      audioStreamRef.current = audioStream;
      setIsMicReady(true);
      setSpeechError(null);
    } catch (err) {
      console.warn("[Speech] Mic denied:", err);
      setSpeechError("Microphone access denied — speech analysis disabled");
      setIsMicReady(false);
    }
  };

  // ── Mic stop ──────────────────────────────────────────────
  const stopMic = useCallback(() => {
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setIsMicReady(false);
    setIsRecording(false);
  }, []);

  // ── Record 4s → send to speech API ────────────────────────
  const recordAndAnalyze = useCallback(() => {
    if (!audioStreamRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    try {
      const recorder = new MediaRecorder(audioStreamRef.current, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        setIsRecording(false);

        try {
          // Step 1: decode webm → AudioBuffer using Web Audio API
          const webmBlob  = new Blob(audioChunksRef.current, { type: mimeType });
          const webmBuffer= await webmBlob.arrayBuffer();
          const audioCtx  = new AudioContext({ sampleRate: 16000 });
          const audioBuffer = await audioCtx.decodeAudioData(webmBuffer);
          await audioCtx.close();

          // Step 2: render to WAV bytes (16-bit PCM)
          const numChannels = 1;
          const sampleRate  = audioBuffer.sampleRate;
          const pcmData     = audioBuffer.getChannelData(0); // mono
          const wavBuffer   = encodeWAV(pcmData, sampleRate, numChannels);

          // Step 3: base64 encode the WAV
          const b64 = btoa(
            new Uint8Array(wavBuffer).reduce((s, b) => s + String.fromCharCode(b), "")
          );

          const chunkIdx = chunkIndexRef.current++;
          const res = await fetch(`${SPEECH_API_BASE}/api/speech/analyze`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              audio:      b64,
              sessionId:  "live-session",
              patientId:  "user",
              chunkIndex: chunkIdx,
            }),
          });
          if (!res.ok) throw new Error(`Speech API ${res.status}`);
          const data: SpeechResponse = await res.json();
          setSpeechResult(data);
          setSpeechError(null);
        } catch (err) {
          console.error("[Speech] processing error:", err);
          setSpeechError("Speech API offline — run: python speech_api_v2.py");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, SPEECH_CHUNK_MS);
    } catch (err) {
      console.warn("[Speech] Recorder error:", err);
    }
  }, []);

  // ── Start camera + mic ─────────────────────────────────────
  const startCamera = async () => {
    setViewMode("camera");
    setIsStartingCamera(true);
    setApiError(null);
    setSpeechResult(null);
    chunkIndexRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,  // video stream — mic is separate
      });
      streamRef.current = stream;
      setIsCameraReady(true);
      setIsDetecting(true);
      await startMic(); // mic starts separately — camera works even if mic fails
    } catch (err) {
      console.error("Camera error:", err);
      setApiError("Camera access denied. Check browser permissions.");
      setViewMode("tips");
    } finally {
      setIsStartingCamera(false);
    }
  };

  // ── Stop camera + mic → show results ──────────────────────
  const stopCamera = useCallback(() => {
    if (intervalRef.current)       clearInterval(intervalRef.current);
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    stopMic();

    if (result)       setFinalResult(result);
    if (speechResult) setFinalSpeechResult(speechResult);

    setIsCameraReady(false);
    setIsDetecting(false);
    setViewMode("results");
  }, [result, speechResult, stopMic]);

  // ── Face analysis loop ─────────────────────────────────────
  const sendFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || viewMode !== "camera") return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    if (!ctx || video.readyState < 2 || video.videoWidth === 0) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    try {
      const res = await fetch(`${FACE_API_BASE}/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: base64 }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data: EmotionResponse = await res.json();
      setResult(data);
      setApiError(null);

      fpsCountRef.current++;
      const now = Date.now();
      if (now - fpsTimerRef.current >= 1000) {
        setFps(fpsCountRef.current);
        fpsCountRef.current = 0;
        fpsTimerRef.current = now;
      }
    } catch {
      setApiError("Cannot reach Face API. Is face.py running on port 8000?");
    }
  }, [viewMode]);

  // Face interval
  useEffect(() => {
    if (isDetecting && isCameraReady && viewMode === "camera") {
      intervalRef.current = setInterval(sendFrame, FACE_INTERVAL_MS);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isDetecting, isCameraReady, viewMode, sendFrame]);

  // Speech interval — fires when mic is ready
  useEffect(() => {
    if (isMicReady && isDetecting && viewMode === "camera") {
      recordAndAnalyze(); // first chunk immediately
      speechIntervalRef.current = setInterval(recordAndAnalyze, SPEECH_INTERVAL_MS);
    }
    return () => { if (speechIntervalRef.current) clearInterval(speechIntervalRef.current); };
  }, [isMicReady, isDetecting, viewMode, recordAndAnalyze]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current)       clearInterval(intervalRef.current);
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if (streamRef.current)         streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioStreamRef.current)    audioStreamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Reset ──────────────────────────────────────────────────
  const resetSession = async () => {
    try { await fetch(`${FACE_API_BASE}/reset`, { method: "POST" }); } catch {}
    setResult(null);
    setFinalResult(null);
    setSpeechResult(null);
    setFinalSpeechResult(null);
    chunkIndexRef.current = 0;
  };

  // ── Derived display values ─────────────────────────────────
  const displayResult       = viewMode === "results" ? finalResult       : result;
  const displaySpeechResult = viewMode === "results" ? finalSpeechResult : speechResult;

  const emotion      = displayResult?.emotion             ?? "unknown";
  const confidence   = displayResult?.confidence          ?? 0;
  const scores       = displayResult?.scores              ?? {};
  const mhScore      = displayResult?.mental_health_score ?? 50;
  const faceDetected = displayResult?.face_detected       ?? false;

  const sortedEmotions = Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, 7);

  const mhColor =
    mhScore >= 70 ? "text-green-400" :
    mhScore >= 50 ? "text-yellow-400" :
                    "text-red-400";

  // ── Render ─────────────────────────────────────────────────
  return (
    <Card className="glass-card p-6 border-gray-700/50 w-full max-w-4xl mx-auto min-h-[500px] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            viewMode === "camera"
              ? isDetecting ? "bg-green-500 animate-pulse" : "bg-gray-600"
              : "bg-blue-500"
          }`} />
          <h2 className="text-xl font-semibold text-white tracking-wide uppercase">
            {viewMode === "tips"    ? "Mental Health & Wellness"  :
             viewMode === "results" ? "Emotion Analysis Results"  :
                                      "Live Emotion Detection"}
          </h2>
        </div>

        {viewMode === "camera" && (
          <div className="flex items-center gap-3">
            {/* Mic status badge */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isMicReady
                ? isRecording
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-gray-700/40 text-gray-500 border-gray-600/30"
            }`}>
              {isMicReady
                ? isRecording
                  ? <><Mic className="w-3 h-3 animate-pulse" /> Recording</>
                  : <><Mic className="w-3 h-3" /> Mic Active</>
                : <><MicOff className="w-3 h-3" /> No Mic</>
              }
            </div>
            {isDetecting && (
              <span className="text-xs text-gray-400 font-mono">{fps} fps</span>
            )}
            <Button
              onClick={stopCamera}
              variant="ghost"
              size="sm"
              className="rounded-full w-8 h-8 p-0 bg-green-500 shadow-lg shadow-green-500/30 hover:bg-green-600"
            >
              <Circle className="w-4 h-4" fill="currentColor" />
            </Button>
          </div>
        )}
      </div>

      {/* ═══ TIPS VIEW ═══════════════════════════════════════════ */}
      {viewMode === "tips" && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {TIPS_DATA.map((tip, index) => (
              <div key={index} className="border border-gray-700 rounded-lg overflow-hidden flex flex-col">
                <button
                  onClick={() => setActiveTip(activeTip === index ? null : index)}
                  className="w-full flex justify-between items-center p-4 bg-gray-800 hover:bg-gray-700 transition space-x-2"
                >
                  <span className="text-gray-200 font-medium text-left">{tip.title}</span>
                  <span className="text-gray-400 flex-shrink-0">{activeTip === index ? "−" : "+"}</span>
                </button>
                {activeTip === index && (
                  <div className="p-4 bg-gray-900/80 text-gray-300 text-sm border-t border-gray-700 flex-1">
                    {tip.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t border-gray-800">
            <div className="text-center mb-4">
              <p className="text-gray-400">Want to check your current mental wellbeing state?</p>
              <p className="text-gray-600 text-sm mt-1">Camera + Microphone will be used for face and speech analysis</p>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-900/20 transition-all h-12 text-lg font-medium"
              onClick={startCamera}
            >
              <Video className="w-5 h-5 mr-2" />
              Start Live Emotion Detection
            </Button>
          </div>
        </div>
      )}

      {/* ═══ CAMERA VIEW ═════════════════════════════════════════ */}
      {viewMode === "camera" && (
        <div className="flex-1 flex flex-col">
          <div
            className="relative rounded-xl overflow-hidden border border-gray-700/50 bg-black mb-6 flex-shrink-0"
            style={{ minHeight: "360px", aspectRatio: "16/9", maxHeight: "60vh" }}
          >
            <canvas ref={canvasRef} className="hidden" />
            <video
              ref={videoRef}
              autoPlay muted playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraReady ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Face emotion — top left */}
            {isCameraReady && faceDetected && emotion !== "unknown" && (
              <div className="absolute top-4 left-4 z-10">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-md font-semibold border backdrop-blur-sm shadow-lg ${
                  EMOTION_BADGE[emotion] ?? EMOTION_BADGE.unknown
                }`}>
                  <span className="text-xl">{EMOTION_EMOJI[emotion]}</span>
                  <span className="uppercase tracking-wide">{emotion}</span>
                  <span className="opacity-70 bg-black/20 px-2 rounded-full ml-1">{confidence.toFixed(1)}%</span>
                </span>
              </div>
            )}

            {/* Speech emotion — top right */}
            {isCameraReady && speechResult && speechResult.emotion !== "unknown" && (
              <div className="absolute top-4 right-4 z-10">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border backdrop-blur-sm shadow-lg ${
                  EMOTION_BADGE[speechResult.emotion] ?? EMOTION_BADGE.unknown
                }`}>
                  <Mic className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-wide">{speechResult.emotion}</span>
                  <span className="opacity-70">{(speechResult.confidence * 100).toFixed(0)}%</span>
                </span>
              </div>
            )}

            {/* Recording indicator — bottom left */}
            {isRecording && (
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-400 font-medium">Recording speech...</span>
              </div>
            )}

            {/* No face */}
            {isCameraReady && !faceDetected && isDetecting && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-gray-700/50 flex items-center gap-3 shadow-xl">
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300 text-sm font-medium">Position your face clearly in frame</span>
                </div>
              </div>
            )}

            {/* Starting spinner */}
            {isStartingCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 z-20 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full border-2 border-gray-600 border-t-blue-500 border-l-blue-500 animate-spin" />
                <p className="text-gray-300 font-medium">Starting camera & microphone...</p>
              </div>
            )}
          </div>

          {/* Error banners */}
          {apiError && (
            <div className="flex items-center gap-2 mb-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{apiError}
            </div>
          )}
          {speechError && (
            <div className="flex items-center gap-2 mb-2 px-4 py-3 rounded-lg bg-orange-900/30 border border-orange-700/40 text-orange-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{speechError}
            </div>
          )}

          {/* Bottom stats */}
          <div className="mt-auto flex flex-col md:flex-row gap-4 items-stretch">
            {/* Wellbeing */}
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-full">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Wellbeing Index</p>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold ${mhColor}`}>{mhScore.toFixed(0)}</span>
                  <span className="text-sm text-gray-500 mb-1">/100</span>
                </div>
              </div>
            </div>

            {/* Face dominant */}
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-full">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Face Dominant</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {displayResult?.session_dominant && (
                    <span>{EMOTION_EMOJI[displayResult.session_dominant] ?? ""}</span>
                  )}
                  <span className="text-lg text-white capitalize font-bold">
                    {displayResult?.session_dominant ?? "Analyzing..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Speech emotion */}
            <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-full">
                {isMicReady
                  ? <Mic className="w-5 h-5 text-green-400" />
                  : <MicOff className="w-5 h-5 text-gray-500" />
                }
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Speech Emotion</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {speechResult?.emotion && (
                    <span>{EMOTION_EMOJI[speechResult.emotion] ?? ""}</span>
                  )}
                  <span className="text-lg text-white capitalize font-bold">
                    {speechResult?.emotion ?? (isMicReady ? "Listening..." : "No mic")}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={stopCamera}
              className="h-auto bg-red-900/60 hover:bg-red-800/80 text-red-100 border border-red-800/50 px-6 font-medium"
            >
              Stop & View Results
            </Button>
          </div>
        </div>
      )}

      {/* ═══ RESULTS VIEW ════════════════════════════════════════ */}
      {viewMode === "results" && (
        <div className="flex-1 flex flex-col justify-center py-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-900/30 border-2 border-blue-500/30 mb-4 shadow-lg shadow-blue-900/20">
              <Brain className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Session Complete</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Summary based on facial expression and speech emotion analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full mb-10">

            {/* Wellbeing score card */}
            <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Wellbeing Score</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-extrabold ${mhColor}`}>{mhScore.toFixed(0)}</span>
                <span className="text-xl text-gray-500">/ 100</span>
              </div>
              <div className="mt-4 w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className={`h-full ${mhScore >= 70 ? "bg-green-500" : mhScore >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${Math.max(0, Math.min(100, mhScore))}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {mhScore >= 70 ? "😊 Emotionally stable" :
                 mhScore >= 50 ? "😐 Mild stress detected" :
                                 "😟 High stress — consider a break"}
              </p>
            </div>

            {/* Face emotions card */}
            <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-400" />
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Face Emotions</p>
              </div>
              {sortedEmotions.length > 0 ? (
                <div className="space-y-3">
                  {sortedEmotions.slice(0, 4).map(([label, score]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-lg w-6 text-center">{EMOTION_EMOJI[label] ?? "•"}</span>
                      <span className="w-16 text-sm text-gray-300 capitalize">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${EMOTION_COLORS[label] ?? "bg-gray-500"}`}
                          style={{ width: `${Math.min(score, 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500 font-mono">{score.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">No face data captured.</p>
              )}
            </div>

            {/* Speech emotions card */}
            <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Mic className="w-4 h-4 text-green-400" />
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Speech Emotions</p>
              </div>
              {displaySpeechResult?.emotionScores ? (
                <div className="space-y-3">
                  {Object.entries(displaySpeechResult.emotionScores)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([label, score]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-lg w-6 text-center">{EMOTION_EMOJI[label] ?? "•"}</span>
                        <span className="w-16 text-sm text-gray-300 capitalize">{label}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-900 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${EMOTION_COLORS[label] ?? "bg-gray-500"}`}
                            style={{ width: `${Math.min(score * 100, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-gray-500 font-mono">
                          {(score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  {displaySpeechResult.transcript && (
                    <p className="text-xs text-gray-500 mt-3 italic border-t border-gray-700 pt-3">
                      "{displaySpeechResult.transcript.slice(0, 80)}{displaySpeechResult.transcript.length > 80 ? "…" : ""}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <MicOff className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-gray-500 italic text-sm">No speech data captured.</p>
                  <p className="text-gray-600 text-xs mt-1">Run speech_api_v2.py on port 8001</p>
                </div>
              )}
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-auto">
            <Button
              onClick={() => setViewMode("tips")}
              variant="outline"
              className="w-full sm:w-auto border-gray-700 hover:bg-gray-800 text-gray-300 px-6 h-12"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tips
            </Button>
            <Button
              onClick={() => { resetSession(); startCamera(); }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 shadow-lg shadow-blue-900/20 font-medium"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Start New Session
            </Button>
          </div>
        </div>
      )}

    </Card>
  );
}