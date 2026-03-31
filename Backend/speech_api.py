# =================================================================
#   SPEECH API v2  —  matches LiveDetection.tsx exactly
#   Port  : 8001
#   Endpoint the frontend calls:
#       POST /api/speech/analyze
#       Body: { audio: "<base64>", sessionId, patientId, chunkIndex }
#
#   Run: python speech_api_v2.py
# =================================================================

import base64, io, os, warnings, threading, time
import numpy as np
import librosa
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from datetime import datetime
from collections import deque

warnings.filterwarnings("ignore")

# ── Config ────────────────────────────────────────────────────
MODEL_PATH   = r"E:\Finalyear2k26\FinalYear2k26\Model\speech_emotion_model.h5"
PORT         = 8001
SAMPLE_RATE  = 16000
N_FEATURES   = 120
MAX_LEN      = 157
EMOTIONS     = ['anger', 'disgust', 'fear', 'happy', 'neutral', 'sad']
STRESS_W     = {'anger':1.0,'fear':0.9,'disgust':0.7,'sad':0.6,'neutral':0.1,'happy':0.0}

app  = Flask(__name__)
CORS(app)

# ── Load model once at startup ────────────────────────────────
print("[INFO] Loading model...")
model = load_model(MODEL_PATH)
print(f"[INFO] ✅ Model loaded! Input shape: {model.input_shape}")

# ── Session store ─────────────────────────────────────────────
sessions = {}   # sessionId → { predictions, start_time, stress_window }
lock     = threading.Lock()

def get_or_create_session(session_id):
    with lock:
        if session_id not in sessions:
            sessions[session_id] = {
                "session_id":   session_id,
                "start_time":   datetime.now().isoformat(),
                "predictions":  [],
                "stress_window": deque(maxlen=20),
            }
        return sessions[session_id]

# ── Feature extraction (identical to training) ────────────────
def extract_features(audio, sr):
    try:
        if sr != SAMPLE_RATE:
            audio = librosa.resample(y=audio, orig_sr=sr, target_sr=SAMPLE_RATE)
        if audio.ndim > 1:
            audio = librosa.to_mono(audio)

        rms = np.sqrt(np.mean(audio ** 2))
        if rms < 0.001:
            return None

        trimmed, _ = librosa.effects.trim(audio, top_db=30)
        if len(trimmed) >= SAMPLE_RATE * 0.3:
            audio = trimmed

        audio = librosa.util.normalize(audio)

        mfccs    = librosa.feature.mfcc(y=audio, sr=SAMPLE_RATE, n_mfcc=13)
        delta    = librosa.feature.delta(mfccs)
        delta2   = librosa.feature.delta(mfccs, order=2)
        rms_f    = librosa.feature.rms(y=audio)
        zcr      = librosa.feature.zero_crossing_rate(y=audio)
        mel      = librosa.power_to_db(librosa.feature.melspectrogram(y=audio, sr=SAMPLE_RATE, n_mels=40))
        chroma   = librosa.feature.chroma_stft(y=audio, sr=SAMPLE_RATE)
        contrast = librosa.feature.spectral_contrast(y=audio, sr=SAMPLE_RATE)
        harmonic = librosa.effects.harmonic(audio)
        tonnetz  = librosa.feature.tonnetz(y=harmonic, sr=SAMPLE_RATE)

        features = np.vstack([mfccs, delta, delta2, rms_f, zcr, mel, chroma, contrast, tonnetz])

        if features.shape[0] < N_FEATURES:
            pad = np.zeros((N_FEATURES - features.shape[0], features.shape[1]))
            features = np.vstack([features, pad])
        else:
            features = features[:N_FEATURES, :]

        padded = np.zeros((N_FEATURES, MAX_LEN))
        copy_len = min(features.shape[1], MAX_LEN)
        padded[:, :copy_len] = features[:, :copy_len]

        mean   = np.mean(padded, axis=(0, 1), keepdims=True)
        std    = np.std(padded,  axis=(0, 1), keepdims=True)
        padded = (padded - mean) / (std + 1e-8)
        padded = np.expand_dims(np.expand_dims(padded, -1), 0)
        return padded.astype(np.float32)

    except Exception as e:
        print(f"[feature error] {e}")
        return None

# ── Audio decoder (wav only — conversion done in browser) ─────
def decode_audio_bytes(audio_bytes: bytes):
    """
    Decode raw WAV bytes → numpy float32 array.
    The browser converts webm→wav before sending, so we only need
    to handle WAV here. librosa handles this natively.
    """
    try:
        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=None, mono=True)
        return audio, sr
    except Exception as e:
        raise RuntimeError(f"librosa load failed: {e}")

# ── Health ────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
@app.route('/api/speech/health', methods=['GET'])
def health():
    return jsonify({
        "status":  "online",
        "model":   "speech_emotion_CNN",
        "port":    PORT,
        "emotions": EMOTIONS,
    })

# ── Main endpoint — called by LiveDetection.tsx every 5 seconds ─
@app.route('/api/speech/analyze', methods=['POST'])
def analyze_speech():
    """
    Frontend sends:
        { audio: "<base64 wav/webm>", sessionId, patientId, chunkIndex }
    Returns:
        { emotion, confidence, transcript, sentiment, emotionScores }
    """
    data = request.get_json(silent=True) or {}

    session_id  = data.get('sessionId',  'default')
    patient_id  = data.get('patientId',  'unknown')
    chunk_index = data.get('chunkIndex', 0)
    b64_audio   = data.get('audio', '')

    if not b64_audio:
        return jsonify({"error": "No audio provided"}), 400

    # Decode base64 → bytes → numpy array
    # Browser sends audio/webm which librosa can't always read directly.
    # decode_audio_bytes handles webm → wav conversion via pydub.
    try:
        audio_bytes = base64.b64decode(b64_audio)
        print(f"[DEBUG] Audio bytes received: {len(audio_bytes)} bytes, chunk #{chunk_index}")
        audio, sr   = decode_audio_bytes(audio_bytes)
        print(f"[DEBUG] Decoded audio: shape={audio.shape}, sr={sr}, duration={len(audio)/sr:.2f}s")
    except Exception as e:
        print(f"[ERROR] Audio decode failed: {e}")
        return jsonify({"error": f"Audio decode failed: {e}"}), 400

    # Extract features
    features = extract_features(audio, sr)
    if features is None:
        return jsonify({
            "emotion":       "neutral",
            "confidence":    0.0,
            "transcript":    "",
            "sentiment":     "neutral",
            "emotionScores": {e: 0.0 for e in EMOTIONS},
            "note":          "silent_audio",
        })

    # Predict
    probs   = model.predict(features, verbose=0)[0]
    scores  = {e: float(p) for e, p in zip(EMOTIONS, probs)}
    emotion = max(scores, key=scores.get)
    conf    = scores[emotion]

    # Stress score
    stress = sum(scores[e] * STRESS_W[e] for e in EMOTIONS)

    # Session tracking
    sess = get_or_create_session(session_id)
    sess['stress_window'].append(stress)
    avg_stress = float(np.mean(list(sess['stress_window'])))

    pred_record = {
        "timestamp":   datetime.now().isoformat(),
        "chunkIndex":  chunk_index,
        "emotion":     emotion,
        "confidence":  conf,
        "scores":      scores,
        "stressScore": stress,
    }
    with lock:
        sess['predictions'].append(pred_record)

    # Map status
    if avg_stress >= 0.7:   status = "HIGH_STRESS"
    elif avg_stress >= 0.4: status = "MODERATE_STRESS"
    elif avg_stress >= 0.2: status = "MILD_STRESS"
    else:                   status = "NORMAL"

    # Sentiment mapping (positive/negative/neutral)
    sentiment = "positive" if emotion == "happy" else \
                "negative" if emotion in ("anger","fear","disgust","sad") else "neutral"

    return jsonify({
        # Fields LiveDetection.tsx reads:
        "emotion":       emotion,
        "confidence":    round(conf, 4),
        "transcript":    "",           # no ASR in this module
        "sentiment":     sentiment,
        "emotionScores": {e: round(scores[e], 4) for e in EMOTIONS},
        # Extra fields useful for backend:
        "stressScore":         round(stress, 4),
        "avgSessionStress":    round(avg_stress, 4),
        "mentalHealthStatus":  status,
        "sessionId":           session_id,
        "patientId":           patient_id,
        "totalPredictions":    len(sess['predictions']),
        "timestamp":           datetime.now().isoformat(),
    })

# ── Session report endpoint ───────────────────────────────────
@app.route('/api/speech/session/<session_id>', methods=['GET'])
def session_report(session_id):
    with lock:
        sess = sessions.get(session_id)
    if not sess:
        return jsonify({"error": "Session not found"}), 404

    preds = sess['predictions']
    if not preds:
        return jsonify({"sessionId": session_id, "totalPredictions": 0})

    from collections import Counter
    emotion_counts = Counter(p['emotion'] for p in preds)
    dominant       = emotion_counts.most_common(1)[0][0]
    avg_stress     = float(np.mean([p['stressScore'] for p in preds]))

    return jsonify({
        "sessionId":          session_id,
        "startTime":          sess['start_time'],
        "totalPredictions":   len(preds),
        "dominantEmotion":    dominant,
        "emotionDistribution": dict(emotion_counts),
        "avgStressScore":     round(avg_stress, 4),
        "predictions":        preds,
    })

# ── Legacy endpoints (for fusion_controller.py compatibility) ──
@app.route('/predict', methods=['POST'])
def predict_legacy():
    """Keeps old multipart/form-data format working for fusion_controller."""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio_file = request.files['audio']
    try:
        audio, sr = librosa.load(io.BytesIO(audio_file.read()), sr=None, mono=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    features = extract_features(audio, sr)
    if features is None:
        return jsonify({"dominant_emotion":"neutral","confidence":0.0,
                        "scores":{e:0.0 for e in EMOTIONS},
                        "stress_score":0.0,"mental_health_status":"NORMAL"})

    probs  = model.predict(features, verbose=0)[0]
    scores = {e: float(p) for e, p in zip(EMOTIONS, probs)}
    emotion= max(scores, key=scores.get)
    stress = sum(scores[e] * STRESS_W[e] for e in EMOTIONS)

    if stress >= 0.7:   mh = "HIGH_STRESS"
    elif stress >= 0.4: mh = "MODERATE_STRESS"
    elif stress >= 0.2: mh = "MILD_STRESS"
    else:               mh = "NORMAL"

    return jsonify({
        "dominant_emotion":    emotion,
        "confidence":          round(scores[emotion], 4),
        "scores":              {e: round(scores[e], 4) for e in EMOTIONS},
        "stress_score":        round(stress, 4),
        "mental_health_status":mh,
        "timestamp":           datetime.now().isoformat(),
    })

@app.route('/session/start',  methods=['POST'])
def session_start_legacy():
    data = request.get_json(silent=True) or {}
    sid  = data.get('session_id', f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    get_or_create_session(sid)
    return jsonify({"status":"started","session_id":sid})

@app.route('/session/status', methods=['GET'])
def session_status_legacy():
    return jsonify({"active_sessions": list(sessions.keys())})

@app.route('/session/end', methods=['POST'])
def session_end_legacy():
    return jsonify({"status":"ended"})

# ── Start ─────────────────────────────────────────────────────
if __name__ == '__main__':
    print("\n" + "="*55)
    print("   SPEECH API v2  —  Frontend Compatible")
    print("="*55)
    print(f"  Port     : {PORT}")
    print(f"  Endpoint : POST http://localhost:{PORT}/api/speech/analyze")
    print(f"  Health   : GET  http://localhost:{PORT}/health")
    print("="*55 + "\n")
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)