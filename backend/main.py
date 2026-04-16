from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

from ml_pipelines.nlp_chatbot.chatbot import process_chat_message
from ml_pipelines.risk_engine.predictor import predict_academic_risk
from ml_pipelines.recommendations.embedding import get_recommendations
from database.mock_data import mock_user_profile, mock_marks

app = FastAPI()

# Add this entire block right below app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Whitelists your Next.js ports
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"], # Allows all headers
)

class ChatRequest(BaseModel):
    message: str

class ChatMessage(BaseModel):
    message: str
    user_id: str

class RiskProfileRequest(BaseModel):
    student_id: str
    marks: list[float] = None
    attendance: float = 0.85

class RecommendationRequest(BaseModel):
    query: str

class ProfileUpdate(BaseModel):
    name: str
    location: str
    email: str
    phone: str

class MarkInput(BaseModel):
    subject: str
    exam_type: str
    score: float

# --- Phase 1: Core System MVP Routes ---

@app.post("/api/login")
async def login():
    return {"status": "success", "token": "mock-jwt-token-123"}

@app.post("/api/signup")
async def signup():
    return {"status": "success", "message": "User registered successfully."}

@app.post("/api/profile/update")
async def update_profile(profile: ProfileUpdate):
    mock_user_profile.update(profile.model_dump())
    return {"status": "success", "profile": mock_user_profile}

@app.post("/api/marks/add")
async def add_mark(mark: MarkInput):
    mock_marks.append(mark.model_dump())
    return {"status": "success", "message": "Mark added successfully."}

@app.get("/api/marks/view/{subject}")
async def view_marks(subject: str):
    subject_marks = [m for m in mock_marks if m["subject"].lower() == subject.lower()]
    return {"subject": subject, "marks": subject_marks}

# --- Existing ML Pipeline Routes ---

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    model = genai.GenerativeModel("gemini-2.5-flash", system_instruction="You are Luminary AI, an expert, encouraging academic tutor integrated into a university learning management system. Provide concise, helpful answers.")
    chat_response = model.generate_content(request.message)
    return {"response": chat_response.text}

@app.post("/api/risk/predict")
async def risk_predict_endpoint(request: RiskProfileRequest):
    result = predict_academic_risk(request.student_id, request.marks, request.attendance)
    return result

@app.post("/api/recommendations")
async def recommendations_endpoint(request: RecommendationRequest):
    resources = get_recommendations(request.query)
    return {"resources": resources}

@app.get("/health")
def health_check():
    return {"status": "ok"}
