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
  Video
} from "lucide-react";

// ── Config ────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_EMOTION_API_URL ?? "http://localhost:8000";
const ANALYSIS_INTERVAL_MS = 250;

const EMOTION_COLORS: Record<string, string> = {
  happy:    "bg-yellow-500",
  neutral:  "bg-gray-400",
  sad:      "bg-blue-500",
  angry:    "bg-red-500",
  fear:     "bg-purple-500",
  disgust:  "bg-green-600",
  surprise: "bg-cyan-400",
  unknown:  "bg-gray-600",
};

const EMOTION_BADGE: Record<string, string> = {
  happy:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  neutral:  "bg-gray-500/20 text-gray-300 border-gray-500/40",
  sad:      "bg-blue-500/20 text-blue-300 border-blue-500/40",
  angry:    "bg-red-500/20 text-red-300 border-red-500/40",
  fear:     "bg-purple-500/20 text-purple-300 border-purple-500/40",
  disgust:  "bg-green-500/20 text-green-300 border-green-500/40",
  surprise: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  unknown:  "bg-gray-700/20 text-gray-400 border-gray-700/40",
};

const EMOTION_EMOJI: Record<string, string> = {
  happy: "😊", neutral: "😐", sad: "😢", angry: "😠",
  fear: "😨", disgust: "🤢", surprise: "😲", unknown: "🤔",
};

const TIPS_DATA = [
  {
    title: "🧘 Practice Mindfulness",
    desc: "Spend 10–15 minutes daily focusing on your breath. It reduces stress and improves focus.",
  },
  {
    title: "😴 Maintain Sleep Routine",
    desc: "Aim for 7–8 hours of sleep. A consistent sleep cycle improves mood and brain function.",
  },
  {
    title: "🚶 Stay Physically Active",
    desc: "Light exercise like walking or stretching releases endorphins and reduces anxiety.",
  },
  {
    title: "📵 Digital Detox",
    desc: "Take breaks from screens and social media to reduce mental fatigue.",
  },
  {
    title: "🗣 Talk to Someone",
    desc: "Sharing feelings with friends or family helps relieve emotional pressure.",
  },
  {
    title: "🎯 Set Small Goals",
    desc: "Completing small tasks builds motivation and gives a sense of achievement.",
  },
];

interface EmotionResponse {
  face_detected: boolean;
  emotion: string;
  confidence: number;
  scores: Record<string, number>;
  mental_health_score: number;
  session_dominant: string;
}

// ── Component ─────────────────────────────────────────────
export function LiveDetection() {
  type ViewMode = "tips" | "camera" | "results";

  const [viewMode, setViewMode]                 = useState<ViewMode>("tips");
  const [activeTip, setActiveTip]               = useState<number | null>(null);

  const [isDetecting, setIsDetecting]           = useState(false);
  const [isCameraReady, setIsCameraReady]       = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const [result, setResult]     = useState<EmotionResponse | null>(null);
  const [finalResult, setFinalResult] = useState<EmotionResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fps, setFps]           = useState(0);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsCountRef = useRef(0);
  const fpsTimerRef = useRef(Date.now());

  // ── KEY FIX: assign srcObject after <video> mounts ──────
  useEffect(() => {
    if (viewMode === "camera" && isCameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Video play error:", err);
        setApiError("Could not start video playback.");
      });
    }
  }, [isCameraReady, viewMode]);

  // ── Camera helpers ───────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsDetecting(false);
    
    // Save the final result before switching views if we had one
    if (result) {
        setFinalResult(result);
    }
    setViewMode("results");
    
  }, [result]);

  const startCamera = async () => {
    setViewMode("camera");
    setIsStartingCamera(true);
    setApiError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraReady(true);
      setIsDetecting(true);
    } catch (err) {
      console.error("Camera error:", err);
      setApiError("Camera access denied. Check browser permissions.");
      setViewMode("tips");
    } finally {
      setIsStartingCamera(false);
    }
  };

  // ── Analysis loop ────────────────────────────────────────
  const sendFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || viewMode !== "camera") return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    if (!ctx || video.readyState < 2 || video.videoWidth === 0) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.7);
    const base64  = dataURL.split(",")[1];

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
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
      setApiError("Cannot reach API. Is the server running on port 8000?");
    }
  }, [viewMode]);

  useEffect(() => {
    if (isDetecting && isCameraReady && viewMode === "camera") {
      intervalRef.current = setInterval(sendFrame, ANALYSIS_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDetecting, isCameraReady, viewMode, sendFrame]);

  // ── Reset session ────────────────────────────────────────
  const resetSession = async () => {
    try {
      await fetch(`${API_BASE}/reset`, { method: "POST" });
      setResult(null);
      setFinalResult(null);
    } catch {}
  };

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };
  }, []);

  // ── Derived display variables (for camera or results) ──────
  const displayResult = viewMode === "results" ? finalResult : result;
  
  const emotion      = displayResult?.emotion ?? "unknown";
  const confidence   = displayResult?.confidence ?? 0;
  const scores       = displayResult?.scores ?? {};
  const mhScore      = displayResult?.mental_health_score ?? 50;
  const faceDetected = displayResult?.face_detected ?? false;

  const sortedEmotions = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7);

  const mhColor =
    mhScore >= 70 ? "text-green-400" :
    mhScore >= 50 ? "text-yellow-400" :
                    "text-red-400";


  return (
    <Card className="glass-card p-6 border-gray-700/50 w-full max-w-4xl mx-auto min-h-[500px] flex flex-col">
        
      {/* Dynamic Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {viewMode === "camera" && (
            <div className={`w-2.5 h-2.5 rounded-full ${
              isDetecting ? "bg-green-500 animate-pulse" : "bg-gray-600"
            }`} />
          )}
          {viewMode !== "camera" && (
            <div className={`w-2.5 h-2.5 rounded-full bg-blue-500`} />
          )}
          <h2 className="text-xl font-semibold text-white tracking-wide uppercase">
            {viewMode === "tips" ? "Mental Health & Wellness" : 
             viewMode === "results" ? "Emotion Analysis Results" : "Live Emotion Detection"}
          </h2>
        </div>
        
        {viewMode === "camera" && (
          <div className="flex items-center gap-2">
            {isDetecting && (
              <span className="text-xs text-gray-400 font-mono">{fps} fps</span>
            )}
            <Button
              onClick={stopCamera}
              variant="ghost"
              size="sm"
              className="rounded-full w-8 h-8 p-0 transition-all duration-300 bg-green-500 shadow-lg shadow-green-500/30 hover:bg-green-600"
            >
              <Circle className="w-4 h-4" fill="currentColor" />
            </Button>
          </div>
        )}
      </div>

      {/* --- TIPS VIEW --- */}
      {viewMode === "tips" && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {TIPS_DATA.map((tip, index) => (
              <div
                key={index}
                className="border border-gray-700 rounded-lg overflow-hidden flex flex-col"
              >
                <button
                  onClick={() => setActiveTip(activeTip === index ? null : index)}
                  className="w-full flex justify-between items-center p-4 bg-gray-800 hover:bg-gray-700 transition space-x-2"
                >
                  <span className="text-gray-200 font-medium text-left">
                    {tip.title}
                  </span>
                  <span className="text-gray-400 flex-shrink-0">
                    {activeTip === index ? "−" : "+"}
                  </span>
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


      {/* --- CAMERA VIEW --- */}
      {viewMode === "camera" && (
        <div className="flex-1 flex flex-col">
            <div
              className="relative rounded-xl overflow-hidden border border-gray-700/50 bg-black mb-6 flex-shrink-0"
              style={{ minHeight: "360px", aspectRatio: "16/9", maxHeight: "60vh" }}
            >
              <canvas ref={canvasRef} className="hidden" />

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraReady ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Emotion overlay badge */}
              {isCameraReady && faceDetected && emotion !== "unknown" && (
                <div className="absolute top-4 left-4 z-10 transition-all duration-300">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-md font-semibold border backdrop-blur-sm shadow-lg ${
                    EMOTION_BADGE[emotion] ?? EMOTION_BADGE.unknown
                  }`}>
                    <span className="text-xl">{EMOTION_EMOJI[emotion]}</span>
                    <span className="uppercase tracking-wide">{emotion}</span>
                    <span className="opacity-70 bg-black/20 px-2 rounded-full ml-1">{confidence.toFixed(1)}%</span>
                  </span>
                </div>
              )}

              {/* No face detected */}
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
                  <p className="text-gray-300 font-medium">Initializing camera access…</p>
                </div>
              )}
            </div>
            
            {apiError && (
              <div className="flex items-center gap-2 my-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {apiError}
              </div>
            )}

            {/* Bottom Real-time Stats */}
            <div className="mt-auto flex flex-col md:flex-row gap-4 items-stretch">
                <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-800 rounded-full">
                            <Brain className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Wellbeing Index</p>
                            <div className="flex items-end gap-2">
                                <span className={`text-2xl font-bold ${mhColor}`}>
                                    {mhScore.toFixed(0)}
                                </span>
                                <span className="text-sm text-gray-500 mb-1">/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-800 rounded-full">
                            <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Session Dominant</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {displayResult?.session_dominant && EMOTION_EMOJI[displayResult?.session_dominant] && (
                                    <span>{EMOTION_EMOJI[displayResult.session_dominant]}</span>
                                )}
                                <span className="text-lg text-white capitalize font-bold">
                                    {displayResult?.session_dominant ?? "Analyzing..."}
                                </span>
                            </div>
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


      {/* --- RESULTS VIEW --- */}
      {viewMode === "results" && (
        <div className="flex-1 flex flex-col justify-center py-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-900/30 border-2 border-blue-500/30 mb-4 shadow-lg shadow-blue-900/20">
                    <Brain className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Session Complete</h3>
                <p className="text-gray-400 max-w-md mx-auto">Here is a summary of your emotional state during the session based on facial analysis.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto w-full mb-10">
                {/* Metric 1 */}
                <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 flex flex-col items-center justify-center text-center hover:bg-gray-800/60 transition-colors">
                    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Final Wellbeing Score</p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-extrabold ${mhColor}`}>
                            {mhScore.toFixed(0)}
                        </span>
                        <span className="text-xl text-gray-500">/ 100</span>
                    </div>
                    <div className="mt-4 w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${mhScore >= 70 ? 'bg-green-500' : mhScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, mhScore))}%` }}
                        />
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Emotion Breakdown</p>
                    </div>
                    {sortedEmotions.length > 0 ? (
                        <div className="space-y-3">
                          {sortedEmotions.slice(0,4).map(([label, score]) => (
                            <div key={label} className="flex items-center gap-3">
                                <span className="text-lg w-6 flex justify-center text-center">{EMOTION_EMOJI[label] ?? "•"}</span>
                                <span className="w-20 text-sm text-gray-300 capitalize">{label}</span>
                                <div className="flex-1 h-2 rounded-full bg-gray-900 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${EMOTION_COLORS[label] ?? "bg-gray-500"}`}
                                    style={{ width: `${Math.min(score, 100)}%` }}
                                  />
                                </div>
                                <span className="w-10 text-right text-xs text-gray-500 font-mono">
                                  {score.toFixed(0)}%
                                </span>
                            </div>
                          ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 italic text-sm">
                            No significant emotional data captured during this session.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-auto">
                <Button
                  onClick={() => setViewMode("tips")}
                  variant="outline"
                  className="w-full sm:w-auto border-gray-700 hover:bg-gray-800 text-gray-300 px-6 h-12"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tips
                </Button>
                
                <Button
                  onClick={() => {
                      resetSession();
                      startCamera();
                  }}
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