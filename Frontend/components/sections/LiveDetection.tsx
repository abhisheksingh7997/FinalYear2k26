"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Circle,
  Brain,
  Activity,
  RotateCcw,
  AlertCircle,
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
  const [isDetecting, setIsDetecting]           = useState(false);
  const [isCameraReady, setIsCameraReady]       = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const [result, setResult]     = useState<EmotionResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fps, setFps]           = useState(0);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsCountRef = useRef(0);
  const fpsTimerRef = useRef(Date.now());

  // ── KEY FIX: assign srcObject after <video> mounts ──────
  // isCameraReady flips → React renders <video> → this effect runs →
  // srcObject is safely assigned to the now-existing DOM element.
  useEffect(() => {
    if (isCameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Video play error:", err);
        setApiError("Could not start video playback.");
      });
    }
  }, [isCameraReady]);

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
    setResult(null);
    setApiError(null);
  }, []);

  const startCamera = async () => {
    setIsStartingCamera(true);
    setApiError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      // Set state FIRST so <video> renders, then useEffect assigns srcObject
      setIsCameraReady(true);
      setIsDetecting(true);
    } catch (err) {
      console.error("Camera error:", err);
      setApiError("Camera access denied. Check browser permissions.");
    } finally {
      setIsStartingCamera(false);
    }
  };

  // ── Analysis loop ────────────────────────────────────────
  const sendFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
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
  }, []);

  useEffect(() => {
    if (isDetecting && isCameraReady) {
      intervalRef.current = setInterval(sendFrame, ANALYSIS_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDetecting, isCameraReady, sendFrame]);

  // ── Reset session ────────────────────────────────────────
  const resetSession = async () => {
    try {
      await fetch(`${API_BASE}/reset`, { method: "POST" });
      setResult(null);
    } catch {}
  };

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Derived display ──────────────────────────────────────
  const emotion      = result?.emotion ?? "unknown";
  const confidence   = result?.confidence ?? 0;
  const scores       = result?.scores ?? {};
  const mhScore      = result?.mental_health_score ?? 50;
  const faceDetected = result?.face_detected ?? false;

  const sortedEmotions = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7);

  const mhColor =
    mhScore >= 70 ? "text-green-400" :
    mhScore >= 50 ? "text-yellow-400" :
                    "text-red-400";

  return (
    <Card className="glass-card p-6 hover:shadow-2xl transition-all duration-300 border-gray-700/50 w-full max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            isDetecting ? "bg-green-500 animate-pulse" : "bg-gray-600"
          }`} />
          <h2 className="text-lg font-semibold text-white tracking-wide">
            LIVE EMOTION DETECTION
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isDetecting && (
            <span className="text-xs text-gray-400 font-mono">{fps} fps</span>
          )}
          <Button
            onClick={isDetecting ? stopCamera : startCamera}
            variant="ghost"
            size="sm"
            className={`rounded-full w-8 h-8 p-0 transition-all duration-300 ${
              isDetecting
                ? "bg-green-500 shadow-lg shadow-green-500/30"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            <Circle className="w-4 h-4" fill="currentColor" />
          </Button>
        </div>
      </div>

      {/* Video feed */}
      <div
        className="relative rounded-xl overflow-hidden border border-gray-700/50 bg-black cursor-pointer mb-4"
        style={{ aspectRatio: "4/3" }}
        onClick={isDetecting ? stopCamera : startCamera}
      >
        {/* Hidden canvas for frame capture — always in DOM */}
        <canvas ref={canvasRef} className="hidden" />

        {/*
          Always render <video> so the ref is available immediately.
          Visibility is controlled by opacity so srcObject assignment
          via useEffect never races against a conditional render.
        */}
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
          <div className="absolute top-3 left-3 z-10">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border backdrop-blur-sm ${
              EMOTION_BADGE[emotion] ?? EMOTION_BADGE.unknown
            }`}>
              <span>{EMOTION_EMOJI[emotion]}</span>
              <span className="uppercase tracking-wide">{emotion}</span>
              <span className="opacity-70">{confidence.toFixed(1)}%</span>
            </span>
          </div>
        )}

        {/* No face detected */}
        {isCameraReady && !faceDetected && isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-gray-500 text-sm font-medium bg-black/60 px-3 py-1 rounded-full">
              No face detected
            </span>
          </div>
        )}

        {/* Stop button */}
        {isCameraReady && (
          <div className="absolute bottom-3 right-3 z-10">
            <Button
              onClick={(e) => { e.stopPropagation(); stopCamera(); }}
              size="sm"
              className="bg-red-800/80 hover:bg-red-700 text-white text-xs backdrop-blur-sm"
            >
              Stop
            </Button>
          </div>
        )}

        {/* Starting spinner */}
        {isStartingCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-20">
            <div className="w-12 h-12 rounded-full border-2 border-gray-600 border-t-green-500 animate-spin" />
            <p className="text-gray-400 text-sm">Starting camera…</p>
          </div>
        )}

        {/* Idle — click to start */}
        {!isCameraReady && !isStartingCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 group z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center group-hover:from-gray-600 group-hover:to-gray-700 transition-all">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
              Click to start detection
            </p>
          </div>
        )}
      </div>

      {/* Error banner */}
      {apiError && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {apiError}
        </div>
      )}

      {/* Emotion score bars */}
      {isDetecting && faceDetected && sortedEmotions.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {sortedEmotions.map(([label, score]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-16 text-right text-xs text-gray-400 font-mono capitalize">
                {label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    EMOTION_COLORS[label] ?? "bg-gray-500"
                  }`}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
              <span className="w-10 text-xs text-gray-500 font-mono">
                {score.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom stats row */}
      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400">Wellbeing</span>
          <span className={`text-sm font-bold ${mhColor}`}>
            {mhScore.toFixed(0)}/100
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400">Session</span>
          <span className="text-xs text-white capitalize font-medium">
            {result?.session_dominant ?? "—"}
          </span>
        </div>

        <Button
          onClick={resetSession}
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-300 h-7 px-2"
          title="Reset session stats"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}