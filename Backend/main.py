import base64
import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepface import DeepFace
from collections import deque, Counter

app = FastAPI()

# Allow CORS for the frontend (assumed to run on localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)



# Session history buffer for smoothing
emotion_buffer = deque(maxlen=30)
session_history = deque(maxlen=100)

class ImageRequest(BaseModel):
    image: str

def calculate_mental_health_score(scores: dict) -> int:
    """
    Calculate a basic mental health score (0-100) from emotion probabilities.
    higher weights for positive emotions, neutral in middle, negative lowering the score.
    """
    happy = scores.get("happy", 0)
    surprise = scores.get("surprise", 0)
    neutral = scores.get("neutral", 0)
    
    sad = scores.get("sad", 0)
    angry = scores.get("angry", 0)
    fear = scores.get("fear", 0)
    disgust = scores.get("disgust", 0)
    
    # Formula: baseline 50 + (positive/2) - (negative/2)
    positive_impact = (happy * 1.0 + surprise * 0.5) / 2
    negative_impact = (sad * 1.0 + angry * 1.0 + fear * 1.0 + disgust * 1.0) / 2
    
    score = 50 + positive_impact - negative_impact
    return int(max(0, min(100, score)))

@app.post("/analyze")
async def analyze_frame(request: ImageRequest):
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(request.image)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"error": "Invalid image"}

        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        face_detected = False
        dominant_emotion = "unknown"
        confidence = 0.0
        scores = {}
        mental_health_score = 50
        
        try:
            # Run DeepFace with its default face detector (opencv or mtcnn)
            analysis = DeepFace.analyze(
                rgb_frame,
                actions=['emotion'],
                enforce_detection=True
            )
            
            face_detected = True
            result = analysis[0] if isinstance(analysis, list) else analysis
            raw_emotion = result['dominant_emotion']
            confidence = float(result['face_confidence'] * 100 if 'face_confidence' in result else 90.0)
            
            # Convert numpy float32 to python float for JSON serialization
            scores = {k: float(v) for k, v in result['emotion'].items()}
            
            emotion_buffer.append(raw_emotion)
            session_history.append(raw_emotion)
            
            # Smooth the dominant emotion over recent frames
            if len(emotion_buffer) > 0:
                counter = Counter(emotion_buffer)
                dominant_emotion = counter.most_common(1)[0][0]
                
            mental_health_score = calculate_mental_health_score(scores)
            
        except ValueError as e:
            # DeepFace raises ValueError when no face is detected with enforce_detection=True
            if "Face could not be detected" in str(e):
                pass
            else:
                print(f"DeepFace analysis error: {e}")
        except Exception as e:
            print(f"Unexpected DeepFace error: {e}")
            pass
        
        # Calculate session dominant
        session_dominant = "—"
        if len(session_history) > 0:
            sess_counter = Counter(session_history)
            session_dominant = sess_counter.most_common(1)[0][0]

        return {
            "face_detected": face_detected,
            "emotion": dominant_emotion,
            "confidence": confidence,
            "scores": scores,
            "mental_health_score": mental_health_score,
            "session_dominant": session_dominant
        }
        
    except Exception as e:
        print(f"Frame processing error: {e}")
        return {"error": str(e)}

@app.post("/reset")
async def reset_session():
    emotion_buffer.clear()
    session_history.clear()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
