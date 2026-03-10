"""
Real-Time Facial Emotion Detection API — v4 (Advanced)
=======================================================
FastAPI server that accepts base64-encoded image frames from the
Next.js frontend and returns emotion analysis results.

Pipeline: Base64 frame → Decode → MediaPipe FaceDetection →
          FaceMesh crop + geometry → Adaptive pre-proc →
          3× DeepFace ensemble → Boost → Exp-decay smooth →
          JSON response

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import csv
import math
import os
import base64
import time
from collections import deque, defaultdict
from datetime import datetime
from contextlib import asynccontextmanager

import cv2
import mediapipe as mp
import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
SMOOTH_BUFFER_SIZE = 6
BASE_PADDING       = 0.28
FACE_CROP_SIZE     = 224
MIN_DETECT_CONF    = 0.50
MIN_TRACK_CONF     = 0.50
MIN_CONF_PCT       = 6.0
CROP_SCALES        = [0.20, 0.30, 0.42]
GEOMETRY_BLEND     = 0.22
EXP_DECAY          = 0.72

SENSITIVITY_BOOST = {
    "angry":   1.8, "disgust": 3.2, "fear":    2.8,
    "sad":     2.4, "surprise": 1.4, "neutral": 0.60, "happy":  0.75,
}
CALIBRATION_FLOOR = {
    "disgust": 1.5, "fear": 1.5, "sad": 2.0,
    "angry":   1.0, "surprise": 0.5, "happy": 0.0, "neutral": 0.0,
}
TRANSITION = {
    "happy":   {"happy":1.0,"neutral":0.9,"surprise":0.7,"sad":0.4,"angry":0.3,"fear":0.3,"disgust":0.2},
    "neutral": {"neutral":1.0,"happy":0.9,"sad":0.8,"angry":0.7,"surprise":0.7,"fear":0.6,"disgust":0.5},
    "sad":     {"sad":1.0,"neutral":0.8,"fear":0.7,"angry":0.6,"disgust":0.5,"surprise":0.4,"happy":0.3},
    "angry":   {"angry":1.0,"disgust":0.9,"sad":0.6,"neutral":0.5,"fear":0.5,"surprise":0.4,"happy":0.2},
    "fear":    {"fear":1.0,"surprise":0.8,"sad":0.7,"neutral":0.6,"angry":0.5,"disgust":0.4,"happy":0.2},
    "disgust": {"disgust":1.0,"angry":0.8,"neutral":0.5,"sad":0.5,"fear":0.4,"surprise":0.3,"happy":0.2},
    "surprise":{"surprise":1.0,"happy":0.8,"fear":0.7,"neutral":0.7,"sad":0.4,"angry":0.4,"disgust":0.3},
    "unknown": {e: 1.0 for e in ["angry","disgust","fear","happy","sad","surprise","neutral"]},
}
VALENCE = {
    "happy":1.0,"neutral":0.3,"surprise":0.1,
    "sad":-0.6,"angry":-0.8,"fear":-0.7,"disgust":-0.5,
}
EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

LOG_DIR      = "emotion_logs"
CSV_FILENAME = os.path.join(LOG_DIR, f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")

# ─────────────────────────────────────────────
# Global state (per-session smoothing buffer)
# ─────────────────────────────────────────────
_state = {
    "emotion_buffer": deque(maxlen=SMOOTH_BUFFER_SIZE),
    "last_emotion":   "unknown",
    "last_conf":      0.0,
    "last_df_scores": None,
    "stats":          None,
    "csv_writer":     None,
    "csv_fh":         None,
}

_clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(4, 4))

# MediaPipe singletons
_detector  = None
_face_mesh = None


# ─────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _detector, _face_mesh, _state

    _detector = mp.solutions.face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=MIN_DETECT_CONF
    )
    _face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False, max_num_faces=1, refine_landmarks=True,
        min_detection_confidence=MIN_DETECT_CONF,
        min_tracking_confidence=MIN_TRACK_CONF,
    )
    _state["stats"] = SessionStats()
    os.makedirs(LOG_DIR, exist_ok=True)
    fh = open(CSV_FILENAME, "a", newline="", encoding="utf-8")
    writer = csv.writer(fh)
    if os.path.getsize(CSV_FILENAME) == 0:
        writer.writerow(["timestamp", "emotion", "confidence_pct"])
    _state["csv_writer"] = writer
    _state["csv_fh"]     = fh
    print(f"[INFO] Emotion API started. Logging to: {CSV_FILENAME}")
    yield
    # Shutdown
    if _detector:  _detector.close()
    if _face_mesh: _face_mesh.close()
    if _state["csv_fh"]: _state["csv_fh"].close()
    print("[INFO] Emotion API stopped.")


app = FastAPI(title="Emotion Detection API v4", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Session stats
# ─────────────────────────────────────────────
class SessionStats:
    def __init__(self):
        self.counts     = defaultdict(int)
        self.conf_total = defaultdict(float)
        self.total      = 0

    def update(self, emotion: str, confidence: float):
        self.counts[emotion]     += 1
        self.conf_total[emotion] += confidence
        self.total               += 1

    def dominant(self):
        return max(self.counts, key=self.counts.get) if self.counts else "N/A"

    def distribution(self):
        if not self.total: return {}
        return {e: round(100 * c / self.total, 1) for e, c in self.counts.items()}

    def mental_health_score(self) -> float:
        if not self.total: return 50.0
        dist = self.distribution()
        raw  = sum(VALENCE.get(e, 0) * (p / 100) for e, p in dist.items())
        return round((raw + 1) / 2 * 100, 1)


# ─────────────────────────────────────────────
# Pre-processing
# ─────────────────────────────────────────────
def adaptive_gamma(gray: np.ndarray) -> np.ndarray:
    mean  = np.mean(gray) / 255.0
    gamma = math.log(0.5) / (math.log(mean) if mean > 0 else 1e-6)
    gamma = float(np.clip(gamma, 0.4, 2.5))
    table = np.array([(i / 255.0) ** gamma * 255 for i in range(256)], dtype=np.uint8)
    return cv2.LUT(gray, table)


def preprocess_crop(bgr: np.ndarray) -> np.ndarray:
    denoised     = cv2.bilateralFilter(bgr, d=7, sigmaColor=55, sigmaSpace=55)
    lab          = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l, a, b      = cv2.split(lab)
    l_gamma      = adaptive_gamma(l)
    l_clahe      = _clahe.apply(l_gamma)
    enhanced_lab = cv2.merge([l_clahe, a, b])
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)


# ─────────────────────────────────────────────
# Face detection
# ─────────────────────────────────────────────
def detect_face(frame):
    h, w    = frame.shape[:2]
    results = _detector.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    if not results.detections:
        return None
    best = max(results.detections, key=lambda d: d.score[0])
    bb   = best.location_data.relative_bounding_box
    x1 = max(0,     int(bb.xmin * w))
    y1 = max(0,     int(bb.ymin * h))
    x2 = min(w - 1, int((bb.xmin + bb.width)  * w))
    y2 = min(h - 1, int((bb.ymin + bb.height) * h))
    return (x1, y1, x2, y2) if x2 > x1 and y2 > y1 else None


# ─────────────────────────────────────────────
# FaceMesh crop refinement + landmark geometry
# ─────────────────────────────────────────────
_LM = {
    "left_brow":   [70,63,105,66,107],
    "right_brow":  [336,296,334,293,300],
    "left_eye":    [33,160,158,133,153,144],
    "right_eye":   [362,385,387,263,373,380],
    "nose_tip":    [1],
    "mouth_left":  [61],
    "mouth_right": [291],
    "mouth_top":   [13],
    "mouth_bottom":[14],
    "chin":        [152],
    "forehead":    [10],
}


def _lm_mean(landmarks, indices, w, h):
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in indices]
    return np.mean(pts, axis=0)


def extract_geometry_scores(landmarks, w, h) -> dict:
    lm       = landmarks
    le       = _lm_mean(lm, _LM["left_eye"],  w, h)
    re       = _lm_mean(lm, _LM["right_eye"], w, h)
    inter_eye = max(np.linalg.norm(le - re), 1.0)

    fhead = _lm_mean(lm, _LM["forehead"], w, h)
    chin  = _lm_mean(lm, _LM["chin"],     w, h)

    lb = _lm_mean(lm, _LM["left_brow"],  w, h)
    rb = _lm_mean(lm, _LM["right_brow"], w, h)
    brow_y_norm  = ((le[1] - lb[1]) + (re[1] - rb[1])) / (2 * inter_eye)
    brow_x_spread = abs(lb[0] - rb[0]) / inter_eye

    ml = _lm_mean(lm, _LM["mouth_left"],   w, h)
    mr = _lm_mean(lm, _LM["mouth_right"],  w, h)
    mt = _lm_mean(lm, _LM["mouth_top"],    w, h)
    mb = _lm_mean(lm, _LM["mouth_bottom"], w, h)
    mouth_curve = ((ml[1] + mr[1]) / 2 - mt[1]) / inter_eye
    mouth_open  = np.linalg.norm(mt - mb) / inter_eye

    def eye_open(indices):
        pts = np.array([(lm[i].x * w, lm[i].y * h) for i in indices])
        return (np.max(pts[:,1]) - np.min(pts[:,1])) / inter_eye

    eye_openness = (eye_open(_LM["left_eye"]) + eye_open(_LM["right_eye"])) / 2

    g = {e: 0.0 for e in EMOTION_LABELS}
    raise_sig  = float(np.clip(brow_y_norm,   0, 1))
    furrow_sig = float(np.clip(2.0 - brow_x_spread, 0, 1))
    g["fear"]     += raise_sig * 40
    g["surprise"] += raise_sig * 35
    g["angry"]    += furrow_sig * 35
    g["disgust"]  += furrow_sig * 30

    if mouth_curve > 0.05:
        g["happy"] += float(np.clip(mouth_curve * 80, 0, 50))
    else:
        g["sad"]   += float(np.clip(-mouth_curve * 100, 0, 50))

    open_sig = float(np.clip((mouth_open - 0.15) * 80, 0, 40))
    g["surprise"] += open_sig * 0.6
    g["fear"]     += open_sig * 0.4

    eye_sig = float(np.clip((eye_openness - 0.2) * 60, 0, 35))
    g["fear"]     += eye_sig * 0.55
    g["surprise"] += eye_sig * 0.45

    total = sum(g.values()) or 1.0
    return {k: (v / total) * 100 for k, v in g.items()}


def refine_crop_with_facemesh(frame, coarse_box, padding):
    h, w = frame.shape[:2]
    cx1, cy1, cx2, cy2 = coarse_box
    crop = frame[cy1:cy2, cx1:cx2]
    if crop.size == 0:
        return None, None

    ch, cw  = crop.shape[:2]
    results = _face_mesh.process(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))

    landmarks = None
    if results.multi_face_landmarks:
        pts = results.multi_face_landmarks[0].landmark
        landmarks = pts
        xs  = [p.x * cw for p in pts]
        ys  = [p.y * ch for p in pts]
        lx1 = int(min(xs)) + cx1; ly1 = int(min(ys)) + cy1
        lx2 = int(max(xs)) + cx1; ly2 = int(max(ys)) + cy1
    else:
        lx1, ly1, lx2, ly2 = cx1, cy1, cx2, cy2

    px  = int((lx2 - lx1) * padding)
    py  = int((ly2 - ly1) * padding)
    rx1 = max(0,     lx1 - px); ry1 = max(0,     ly1 - py)
    rx2 = min(w - 1, lx2 + px); ry2 = min(h - 1, ly2 + py)

    return ((rx1, ry1, rx2, ry2), landmarks) if rx2 > rx1 and ry2 > ry1 else (None, None)


# ─────────────────────────────────────────────
# DeepFace single-scale
# ─────────────────────────────────────────────
def _deepface_scores(bgr_224: np.ndarray):
    try:
        result = DeepFace.analyze(
            img_path=bgr_224, actions=["emotion"],
            enforce_detection=False, silent=True,
        )
        if isinstance(result, list): result = result[0]
        return result.get("emotion", {})
    except Exception:
        return None


# ─────────────────────────────────────────────
# Multi-scale ensemble
# ─────────────────────────────────────────────
def analyze_emotion(frame, base_box):
    all_raw   = []
    landmarks = None

    for scale in CROP_SCALES:
        box, lm = refine_crop_with_facemesh(frame, base_box, scale)
        if box is None:
            continue
        if lm is not None and landmarks is None:
            landmarks = lm

        x1, y1, x2, y2 = box
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            continue

        resized   = cv2.resize(crop, (FACE_CROP_SIZE, FACE_CROP_SIZE))
        processed = preprocess_crop(resized)
        scores    = _deepface_scores(processed)
        if scores is not None:
            all_raw.append(scores)

    if not all_raw:
        return None, None, None

    ensemble = {
        lbl: sum(s.get(lbl, 0.0) for s in all_raw) / len(all_raw)
        for lbl in EMOTION_LABELS
    }
    for lbl, floor in CALIBRATION_FLOOR.items():
        ensemble[lbl] = max(ensemble[lbl], floor)

    boosted = {lbl: ensemble[lbl] * SENSITIVITY_BOOST.get(lbl, 1.0) for lbl in EMOTION_LABELS}
    total   = sum(boosted.values()) or 1.0
    boosted = {lbl: (v / total) * 100 for lbl, v in boosted.items()}

    # Geometry blend
    if landmarks is not None:
        try:
            box0, _ = refine_crop_with_facemesh(frame, base_box, CROP_SCALES[1])
            if box0:
                bx1, by1, bx2, by2 = box0
                bh = by2 - by1 or 1; bw = bx2 - bx1 or 1
                geo = extract_geometry_scores(landmarks, bw, bh)
                boosted = {
                    lbl: (1 - GEOMETRY_BLEND) * boosted[lbl] + GEOMETRY_BLEND * geo.get(lbl, 0.0)
                    for lbl in EMOTION_LABELS
                }
                total = sum(boosted.values()) or 1.0
                boosted = {lbl: (v / total) * 100 for lbl, v in boosted.items()}
        except Exception:
            pass

    dominant   = max(boosted, key=boosted.get)
    confidence = boosted[dominant]
    if confidence < MIN_CONF_PCT:
        return None, None, None

    return boosted, dominant, confidence


# ─────────────────────────────────────────────
# Smoothing + transition penalty
# ─────────────────────────────────────────────
def smooth_emotion(buffer: deque, new_scores, prev_emotion: str):
    if new_scores is None:
        if not buffer:
            return "unknown", 0.0
        new_scores = buffer[-1]

    buffer.append(new_scores)
    n = len(buffer)
    weights = [EXP_DECAY ** (n - 1 - i) for i in range(n)]
    w_total = sum(weights)

    avg = {
        lbl: sum(weights[i] * buffer[i].get(lbl, 0.0) for i in range(n)) / w_total
        for lbl in EMOTION_LABELS
    }
    trans_row = TRANSITION.get(prev_emotion, TRANSITION["unknown"])
    penalised = {lbl: avg[lbl] * trans_row.get(lbl, 0.8) for lbl in EMOTION_LABELS}

    dominant   = max(penalised, key=penalised.get)
    total      = sum(penalised.values()) or 1.0
    confidence = (penalised[dominant] / total) * 100
    return dominant, confidence


# ─────────────────────────────────────────────
# API schemas
# ─────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded JPEG/PNG frame


class EmotionResponse(BaseModel):
    face_detected:  bool
    emotion:        str
    confidence:     float
    scores:         dict
    mental_health_score: float
    session_dominant: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "v4-advanced"}


@app.post("/analyze", response_model=EmotionResponse)
def analyze(req: AnalyzeRequest):
    # Decode base64 frame
    try:
        img_bytes = base64.b64decode(req.image)
        arr       = np.frombuffer(img_bytes, dtype=np.uint8)
        frame     = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode error: {e}")

    # Detect face
    coarse = detect_face(frame)
    state  = _state

    if coarse is None:
        return EmotionResponse(
            face_detected=False,
            emotion="unknown",
            confidence=0.0,
            scores={e: 0.0 for e in EMOTION_LABELS},
            mental_health_score=state["stats"].mental_health_score(),
            session_dominant=state["stats"].dominant(),
        )

    # Run ensemble analysis
    new_scores, _, _ = analyze_emotion(frame, coarse)
    state["last_df_scores"] = new_scores

    # Smooth
    emotion, conf = smooth_emotion(
        state["emotion_buffer"], new_scores, state["last_emotion"]
    )
    state["last_emotion"] = emotion
    state["last_conf"]    = conf

    # Log & update stats
    if emotion != "unknown":
        state["stats"].update(emotion, conf)
        if state["csv_writer"]:
            state["csv_writer"].writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
                emotion, f"{conf:.2f}",
            ])

    # Build display scores from buffer average
    buf = state["emotion_buffer"]
    if buf:
        n = len(buf)
        display_scores = {lbl: sum(s.get(lbl, 0) for s in buf) / n for lbl in EMOTION_LABELS}
    else:
        display_scores = {e: 0.0 for e in EMOTION_LABELS}

    return EmotionResponse(
        face_detected=True,
        emotion=emotion,
        confidence=round(conf, 1),
        scores={k: round(v, 1) for k, v in display_scores.items()},
        mental_health_score=state["stats"].mental_health_score(),
        session_dominant=state["stats"].dominant(),
    )


@app.post("/reset")
def reset_session():
    """Reset the smoothing buffer and session stats."""
    _state["emotion_buffer"].clear()
    _state["last_emotion"]   = "unknown"
    _state["last_conf"]      = 0.0
    _state["last_df_scores"] = None
    _state["stats"]          = SessionStats()
    return {"status": "session reset"}


@app.get("/session")
def session_stats():
    stats = _state["stats"]
    return {
        "total_detections": stats.total,
        "dominant_emotion": stats.dominant(),
        "distribution":     stats.distribution(),
        "mental_health_score": stats.mental_health_score(),
        "csv_log": CSV_FILENAME,
    }