from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
import bcrypt
import json
import io
import PyPDF2
import random
from PIL import Image
from datetime import datetime

load_dotenv()
api_keys = [os.getenv("GEMINI_API_KEY_1"), os.getenv("GEMINI_API_KEY_2")]
api_keys = [k for k in api_keys if k] or [os.getenv("GEMINI_API_KEY")]

from ml_pipelines.nlp_chatbot.chatbot import process_chat_message
from ml_pipelines.risk_engine.predictor import predict_academic_risk
from ml_pipelines.recommendations.embedding import get_recommendations
from database.mock_data import mock_user_profile, mock_marks
from app.core.database import get_session
from app.models import User, Course, Mark, ChatHistory, Assignment, TimetableSlot, Exam, Quiz
from ml_engine import train_and_predict_risk
import tempfile

app = FastAPI()

# Add this entire block right below app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Whitelists your Next.js ports
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"], # Allows all headers
)

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    branch: str = "AIML"

class ChatRequest(BaseModel):
    message: str
    user_id: str = "1"

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

class AssessmentUpdate(BaseModel):
    score: float

class TargetSGPARequest(BaseModel):
    target_sgpa: float = 8.5

# --- Phase 1: Core System MVP Routes ---

@app.post("/api/onboarding/upload")
async def onboarding_upload(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    # 1. Read file
    content = await file.read()
    text = ""
    img = None

    if file.content_type.startswith("image/"):
        img = Image.open(io.BytesIO(content))
    elif file.filename.endswith(".pdf"):
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    else:
        text = content.decode("utf-8", errors="ignore")
        
    # 2. Database - Create New User
    new_username = f"Student_{random.randint(1000, 99999)}"
    new_user = User(
        username=new_username,
        email=f"{new_username.lower()}@example.com",
        role="student",
        hashed_password=bcrypt.hashpw("password".encode('utf-8'), bcrypt.gensalt()).decode()
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    new_user_id = new_user.id

    # 3. AI Processing
    prompt = f"""
    You are an academic curriculum parser. Extract the courses and syllabus topics from the provided text.
    Return a strict JSON format containing exactly an array of objects matching this structure:
    [
        {{"course_code": "...", "title": "...", "credits": X, "type": "...", "syllabus_topics": ["...", "..."], "assessments": [{{"name": "...", "max_marks": X}}]}}
    ]
    Rules:
    - 'type': If title contains "Lab", "Practical", or "Experimental", type is "lab". If "Project", "Seminar", or "Internship", type is "other". Else "theory".
    - 'assessments': Extract from the grading table (e.g., Minor I, Minor II, Quiz, Major). max_marks is the total marks for that specific piece.

    Return ONLY a raw JSON array. Do not wrap the response in ```json markdown blocks. No introductory text.
    Text:
    {text}
    """
    
    ai_text = ""
    courses_data = []
    for key in api_keys:
        try:
            client = genai.Client(api_key=key)
            if img:
                # Convert PIL to bytes
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='PNG')
                content_parts = [
                    types.Part.from_bytes(data=img_byte_arr.getvalue(), mime_type='image/png'),
                    prompt
                ]
            else:
                content_parts = prompt

            resp = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=content_parts
            )
            ai_text = resp.text.strip()
            ai_text = ai_text.replace("```json", "").replace("```", "").strip()
            courses_data = json.loads(ai_text)
            break
        except Exception as e:
            print(f"Key failed in Onboarding, rotating... Error: {e}")
    else:
        courses_data = [{"course_code": "GEN101", "title": "General Demo Course", "credits": 3, "type": "theory", "syllabus_topics": ["Welcome", "Introduction"], "assessments": [{"name": "Midterm", "max_marks": 30}, {"name": "Final", "max_marks": 70}]}]

    # 4. Database - Mapping
    for cd in courses_data:
        code = cd.get("course_code")
        title = cd.get("title")
        credits = cd.get("credits", 3)
        topics = cd.get("syllabus_topics", [])
        
        res = await session.execute(select(Course).where(Course.code == code))
        course = res.scalars().first()
        
        if not course:
            course = Course(
                code=code,
                title=title,
                credits=credits,
                syllabus_topics=json.dumps(topics)
            )
            session.add(course)
            await session.commit()
            await session.refresh(course)
        else:
            if topics:
                course.syllabus_topics = json.dumps(topics)
                session.add(course)
                await session.commit()
                
        mark = Mark(
            score=None,
            max_score=sum([a.get("max_marks", 0) for a in cd.get("assessments", [])]) or 100.0,
            type=cd.get("type", "theory"),
            student_id=new_user_id,
            course_id=course.id
        )
        session.add(mark)
        
        # Create Child Assessments
        for a_data in cd.get("assessments", []):
            quiz = Quiz(
                course_id=course.id,
                student_id=new_user_id,
                title=a_data.get("name"),
                total_questions=a_data.get("max_marks", 10),
                score=None,
                status="Pending"
            )
            session.add(quiz)
        
    await session.commit()
    
    return {"status": "success", "new_user_id": new_user_id, "courses_parsed": len(courses_data)}

# --- Phase 1: Core System MVP Routes ---

@app.post("/api/auth/register")
async def register(req: RegisterRequest, session: AsyncSession = Depends(get_session)):
    # Check if user already exists
    existing_user = await session.execute(select(User).where((User.username == req.username) | (User.email == req.email)))
    if existing_user.scalars().first():
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode()
    new_user = User(
        username=req.username,
        email=req.email,
        hashed_password=hashed,
        role="student",
        branch=req.branch
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return {"status": "success", "user_id": new_user.id}

@app.post("/api/auth/login")
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    # Allow username or email
    result = await session.execute(select(User).where((User.username == req.username) | (User.email == req.username)))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    try:
        is_valid = bcrypt.checkpw(req.password.encode('utf-8'), user.hashed_password.encode('utf-8'))
    except Exception:
        is_valid = False

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "status": "success", 
        "user_id": user.id,
        "message": "Login successful"
    }

@app.get("/api/dashboard/{user_id}")
async def get_dashboard(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    marks_result = await session.execute(
        select(Mark)
        .where(Mark.student_id == user_id)
        .options(selectinload(Mark.course))
    )
    marks = marks_result.scalars().all()
    
    quizzes_result = await session.execute(select(Quiz).where(Quiz.student_id == user_id))
    all_quizzes = quizzes_result.scalars().all()
    assignments_result = await session.execute(select(Assignment).where(Assignment.student_id == user_id))
    all_assignments = assignments_result.scalars().all()

    marks_data = []
    for m in marks:
        course_quizzes_all = [q for q in all_quizzes if q.course_id == m.course_id]
        course_assignments = [a for a in all_assignments if a.course_id == m.course_id]
        
        breakdown = []
        if course_quizzes_all:
            # We have extracted assessments!
            for q in course_quizzes_all:
                score_display = f"{q.score}/{q.total_questions}" if q.score is not None else f"Pending/{q.total_questions}"
                breakdown.append({
                    "id": q.id,
                    "name": q.title, 
                    "score_display": score_display,
                    "raw_score": q.score,
                    "max_score": q.total_questions
                })
            for a in course_assignments[:2]:
                breakdown.append({"name": a.title, "score": f"Status: {a.status}"})
        else:
            # Sparse data fallback (for seeds or manual additions)
            safe_score = m.score if m.score is not None else 0.0
            safe_max_score = m.max_score if m.max_score is not None else 100.0
            breakdown = [
                {"name": "Midterm Exam", "score_display": f"{round(safe_score * 0.3, 1)}/{round(safe_max_score * 0.3, 1)}"},
                {"name": "Assignments", "score_display": "TBD"},
                {"name": "Final Evaluation", "score_display": f"{round(safe_score * 0.5, 1)}/{round(safe_max_score * 0.5, 1)}"}
            ]

        marks_data.append({
            "id": m.id,
            "score": m.score,
            "max_score": m.max_score,
            "type": m.type,
            "breakdown": breakdown,
            "course": {
                "id": m.course.id,
                "code": m.course.code,
                "title": m.course.title,
                "credits": m.course.credits
            }
        })
        
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "marks": marks_data
    }

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
async def chat_endpoint(request: ChatRequest, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if str(request.user_id) == "STU-101" else (int(request.user_id) if str(request.user_id).isdigit() else 1)
    
    # Save user message
    user_chat = ChatHistory(message=request.message, sender="user", user_id=real_user_id)
    session.add(user_chat)
    await session.commit()
    
    # Context Injection
    marks_result = await session.execute(
        select(Mark)
        .where(Mark.student_id == real_user_id)
        .options(selectinload(Mark.course))
    )
    marks = marks_result.scalars().all()
    context = "User's academic context:\n"
    for m in marks:
        context += f"- {m.course.title} ({m.course.code}): {m.score}/{m.max_score} ({m.type})\n"
        
    try:
        # We use the first key as default for chat
        client = genai.Client(api_key=api_keys[0])
        sys_instr = f"You are Luminary AI, an expert, encouraging academic tutor integrated into a university learning management system. Provide concise, helpful answers. Here is the student's academic context:\n{context}"
        
        chat_response = client.models.generate_content(
            model="gemini-2.0-flash",
            config=types.GenerateContentConfig(system_instruction=sys_instr),
            contents=request.message
        )
        ai_reply = chat_response.text
    except Exception as e:
        print(f"Gemini API Error in Chat: {e}")
        ai_reply = "The AI tutor is currently resting, saving your query..."
        
    # Save AI message
    ai_chat = ChatHistory(message=ai_reply, sender="ai", user_id=real_user_id)
    session.add(ai_chat)
    await session.commit()
    
    return {"response": ai_reply}

@app.get("/api/risk/predict/{user_id}")
async def risk_predict_endpoint_get(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    # 1. Get Numerical Predictions from Native ML Engine
    predictions = await train_and_predict_risk(real_user_id, session)
    
    # 2. Determine State First
    if not predictions:
        risk_level = "SAFE"
        avg_score = 100.0
    else:
        avg_score = sum(p['predicted_score'] for p in predictions) / len(predictions)
        if avg_score < 40:
            risk_level = "CRITICAL"
        elif avg_score < 60:
            risk_level = "WARNING"
        else:
            risk_level = "SAFE"
            
    ml_summary = ". ".join([f"{p['course_code']}: {p['predicted_score']}%" for p in predictions])
    
    # Generic Fallbacks
    fallbacks = {
        "CRITICAL": f"CRITICAL: Multiple modules are below passing trajectory. Immediate curriculum intervention is recommended to recover academic standing. Forecast: {ml_summary}",
        "WARNING": f"WARNING: Some modules require attention. Consider reviewing your study plan. Forecast: {ml_summary}",
        "SAFE": f"Academic trajectory is stable. Keep up the good work! Forecast: {ml_summary}"
    }

    final_text = ""
    for key in api_keys:
        try:
            client = genai.Client(api_key=key)
            prompt = f"You are an academic advisor. The student's overall risk level is {risk_level} with an average predicted score of {round(avg_score, 1)}%. Our native ML model predicts: {ml_summary}. Write a 2-sentence encouraging strategy to help them improve or maintain their grades, mentioning these exact predicted numbers."
            response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            final_text = response.text.strip()
            break
        except Exception as e:
            print(f"Gemini NLG Error in Risk Radar: {e}")
            continue
    else:
        # Fallback if Gemini fails (e.g. 429 Rate Limit)
        final_text = fallbacks.get(risk_level, fallbacks["SAFE"])

    return {"riskLevel": risk_level, "details": final_text}

@app.get("/api/risk/roadmap/check/{user_id}")
async def risk_roadmap_check(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    result = await session.execute(select(User).where(User.id == real_user_id))
    user = result.scalars().first()
    if user and user.saved_roadmap:
        return {"has_saved": True, "roadmap": user.saved_roadmap}
    return {"has_saved": False}

@app.post("/api/risk/roadmap/generate/{user_id}")
async def risk_roadmap_generate(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    result = await session.execute(select(User).where(User.id == real_user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    marks_result = await session.execute(
        select(Mark)
        .where(Mark.student_id == real_user_id)
        .options(selectinload(Mark.course))
    )
    marks = marks_result.scalars().all()
    
    context = "User's marks:\n"
    for m in marks:
        context += f"- {m.course.title} ({m.course.code}): {m.score}/{m.max_score} ({m.type})\n"
        
    try:
        client = genai.Client(api_key=api_keys[0])
        prompt = f"""You are an empathetic, expert academic advisor for engineering students.
Based on the following student performance, you must provide a highly structured response using Markdown with the following EXACT sections:

## Comfort & Reassurance
[A personalized, empathetic opening to make the student feel heard and valued.]

## Grade Analysis
[Explicitly mention their failing subjects by name and acknowledge where they are doing well.]

## Strategic Roadmap
[A detailed, prioritized, bulleted study plan.]

## Execution Strategy
[Actionable advice on how to actually study (e.g., Pomodoro, finding YouTube resources, practicing specific numericals).]

Ensure you generate at least 3-4 distinct paragraphs. Do not deviate from these headers.

Context:
{context}"""
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        roadmap = response.text
    except Exception as e:
        print(f"Gemini API Error in Roadmap: {e}")
        roadmap = "I know things might seem challenging right now, but you are more capable than your current grades reflect. Here is a quick 3-step plan: 1. Review your lowest marked subject carefully. 2. Focus on conceptual understanding before practicing. 3. Reach out to your TA or professor for specific guidance. You've got this, don't give up!"

    user.saved_roadmap = roadmap
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return {"roadmap": roadmap}

@app.post("/api/risk/predict")
async def risk_predict_endpoint_post(request: RiskProfileRequest):
    return {"alert_trigger": False, "details": "Please use the new GET /api/risk/predict/{user_id} endpoint for AI recommendations."}

@app.get("/api/risk/predict_sgpa/{user_id}")
async def risk_predict_sgpa(user_id: str, session: AsyncSession = Depends(get_session)):
    try:
        real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
        
        marks_result = await session.execute(
            select(Mark).where(Mark.student_id == real_user_id).options(selectinload(Mark.course))
        )
        marks = marks_result.scalars().all()
        
        predictions = await train_and_predict_risk(real_user_id, session)
        pred_map = {p["course_code"]: p["predicted_score"] for p in predictions}
        
        total_credits = 0
        total_grade_points = 0
        
        for m in marks:
            course = m.course
            credits = course.credits or 3
            
            # Using our existing prediction function's output
            predicted_major = pred_map.get(course.code, 0.0) 
            internal_marks = float(m.score) if m.score else 0.0
            
            total_estimated_marks = min(predicted_major + internal_marks, 100.0)
            
            if total_estimated_marks >= 90:
                grade_point = 10
            elif total_estimated_marks >= 80:
                grade_point = 9
            elif total_estimated_marks >= 70:
                grade_point = 8
            elif total_estimated_marks >= 60:
                grade_point = 7
            elif total_estimated_marks >= 50:
                grade_point = 6
            elif total_estimated_marks >= 40:
                grade_point = 5
            else:
                grade_point = 0 # FAIL condition
                
            total_credits += credits
            total_grade_points += (credits * grade_point)
            
        sgpa = total_grade_points / total_credits if total_credits > 0 else 0.0
        return {"predicted_sgpa": round(sgpa, 2)}
        
    except Exception as e:
        print(f"Error predicting SGPA: {e}")
        return {"predicted_sgpa": 0.0}

@app.post("/api/recommendations")
async def recommendations_endpoint(request: RecommendationRequest):
    resources = get_recommendations(request.query)
    return {"resources": resources}

@app.get("/api/assignments/{user_id}")
async def get_assignments(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    result = await session.execute(
        select(Assignment)
        .where(Assignment.student_id == real_user_id)
        .options(selectinload(Assignment.course))
    )
    assignments = result.scalars().all()
    
    data = []
    for a in assignments:
        data.append({
            "id": a.id,
            "title": a.title,
            "due_date": a.due_date,
            "status": a.status,
            "course": {
                "id": a.course.id,
                "code": a.course.code,
                "title": a.course.title
            }
        })
        
    return {"status": "success", "assignments": data}

@app.get("/api/timetable/{user_id}")
async def get_timetable(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    marks_result = await session.execute(
        select(Mark).where(Mark.student_id == real_user_id)
    )
    marks = marks_result.scalars().all()
    course_ids = list(set([m.course_id for m in marks]))
    
    slots_result = await session.execute(
        select(TimetableSlot)
        .where(TimetableSlot.course_id.in_(course_ids))
        .options(selectinload(TimetableSlot.course))
    )
    slots = slots_result.scalars().all()
    
    data = []
    for s in slots:
        data.append({
            "id": s.id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room_number": s.room_number,
            "course": {
                "id": s.course.id,
                "code": s.course.code,
                "title": s.course.title
            }
        })
        
    return {"status": "success", "timetable": data}

@app.get("/api/exams/{user_id}")
async def get_exams(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    marks_result = await session.execute(
        select(Mark).where(Mark.student_id == real_user_id)
    )
    marks = marks_result.scalars().all()
    course_ids = list(set([m.course_id for m in marks]))
    
    exams_result = await session.execute(
        select(Exam)
        .where(Exam.course_id.in_(course_ids))
        .options(selectinload(Exam.course))
    )
    exams = exams_result.scalars().all()
    
    data = []
    for e in exams:
        data.append({
            "id": e.id,
            "title": e.title,
            "exam_date": e.exam_date.isoformat(),
            "duration_minutes": e.duration_minutes,
            "location": e.location,
            "course": {
                "id": e.course.id,
                "code": e.course.code,
                "title": e.course.title
            }
        })
        
    return {"status": "success", "exams": data}

@app.get("/api/quizzes/{user_id}")
async def get_quizzes(user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    quizzes_result = await session.execute(
        select(Quiz)
        .where(Quiz.student_id == real_user_id)
        .options(selectinload(Quiz.course))
    )
    quizzes = quizzes_result.scalars().all()
    
    data = []
    for q in quizzes:
        data.append({
            "id": q.id,
            "title": q.title,
            "total_questions": q.total_questions,
            "score": q.score,
            "status": q.status,
            "course": {
                "id": q.course.id,
                "code": q.course.code,
                "title": q.course.title
            }
        })
        
    return {"status": "success", "quizzes": data}

@app.get("/api/courses/{course_id}/student/{user_id}")
async def get_course_details(course_id: int, user_id: str, session: AsyncSession = Depends(get_session)):
    real_user_id = 1 if user_id == "STU-101" else (int(user_id) if user_id.isdigit() else 1)
    
    course_result = await session.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    
    if not course:
        return {"status": "error", "message": "Course not found"}
        
    marks_result = await session.execute(
        select(Mark)
        .where(Mark.course_id == course_id)
        .where(Mark.student_id == real_user_id)
    )
    marks = marks_result.scalars().all()
    
    # Dynamic Syllabus
    syllabus = []
    if course.code == "CS301":
        syllabus = [
            {"week": 1, "topic": "Sorting Algorithms", "status": "completed"},
            {"week": 2, "topic": "Graph Theory", "status": "completed"},
            {"week": 3, "topic": "Dynamic Programming", "status": "in_progress"},
            {"week": 4, "topic": "Greedy Algorithms", "status": "upcoming"},
            {"week": 5, "topic": "NP-Completeness", "status": "upcoming"}
        ]
    elif course.code == "CS304":
        syllabus = [
            {"week": 1, "topic": "Relational Algebra", "status": "completed"},
            {"week": 2, "topic": "SQL Queries", "status": "completed"},
            {"week": 3, "topic": "Normalization", "status": "in_progress"},
            {"week": 4, "topic": "Transaction Management", "status": "upcoming"},
            {"week": 5, "topic": "Concurrency Control", "status": "upcoming"}
        ]
    elif "AI303" in course.code:
        syllabus = [
            {"week": 1, "topic": "Neural Networks", "status": "completed"},
            {"week": 2, "topic": "Supervised Learning", "status": "completed"},
            {"week": 3, "topic": "Unsupervised Learning", "status": "in_progress"},
            {"week": 4, "topic": "Deep Learning", "status": "upcoming"},
            {"week": 5, "topic": "Reinforcement Learning", "status": "upcoming"}
        ]
    else:
        syllabus = [
            {"week": 1, "topic": "Introduction & Fundamentals", "status": "completed"},
            {"week": 2, "topic": "Core Architecture & Ecosystem", "status": "completed"},
            {"week": 3, "topic": "Advanced Implementation Strategies", "status": "in_progress"},
            {"week": 4, "topic": "Performance Optimization & Review", "status": "upcoming"},
            {"week": 5, "topic": "Final Project Integration", "status": "upcoming"}
        ]
        
    # Assessment Breakdown: Query the Quiz and Assignment tables
    quizzes_result = await session.execute(
        select(Quiz)
        .where(Quiz.course_id == course_id)
        .where(Quiz.student_id == real_user_id)
    )
    quizzes = quizzes_result.scalars().all()
    
    assignments_result = await session.execute(
        select(Assignment)
        .where(Assignment.course_id == course_id)
        .where(Assignment.student_id == real_user_id)
    )
    assignments = assignments_result.scalars().all()
    
    assessments = []
    for q in quizzes:
        assessments.append({
            "id": f"q_{q.id}",
            "type": "Quiz",
            "title": q.title,
            "status": q.status,
            "score": q.score,
            "max_score": q.total_questions  # assuming total_questions is max score
        })
        
    for a in assignments:
        assessments.append({
            "id": f"a_{a.id}",
            "type": "Assignment",
            "title": a.title,
            "status": a.status,
            "score": None, # Assign grades logic missing from model, so we set null
            "max_score": None
        })
    
    return {
        "status": "success",
        "course": {
            "id": course.id,
            "title": course.title,
            "code": course.code,
            "credits": course.credits
        },
        "marks": [
            {"id": m.id, "type": m.type, "score": m.score, "max_score": m.max_score}
            for m in marks
        ],
        "syllabus": syllabus,
        "assessments": assessments
    }

@app.post("/api/risk/predict-target/{user_id}")
async def predict_target_endpoint(user_id: int, req: TargetSGPARequest, session: AsyncSession = Depends(get_session)):
    # 1. Gather Data
    marks_result = await session.execute(
        select(Mark).where(Mark.student_id == user_id).options(selectinload(Mark.course))
    )
    marks = marks_result.scalars().all()
    
    quizzes_result = await session.execute(select(Quiz).where(Quiz.student_id == user_id))
    all_quizzes = quizzes_result.scalars().all()
    
    course_context = []
    for m in marks:
        q_list = [q for q in all_quizzes if q.course_id == m.course_id]
        graded = [{"name": q.title, "score": q.score, "max": q.total_questions} for q in q_list if q.score is not None]
        pending = [{"name": q.title, "max": q.total_questions} for q in q_list if q.score is None]
        course_context.append({
             "code": m.course.code,
             "name": m.course.title,
             "credits": m.course.credits,
             "graded_assessments": graded,
             "pending_assessments": pending
        })

    # 2. AI Oracle Call
    prompt = f"""
    You are the Luminary AI Oracle, an expert academic strategist.
    A student wants to achieve an SGPA of {req.target_sgpa}.
    
    Current Academic Context:
    {json.dumps(course_context, indent=2)}
    
    Tasks:
    1. Calculate the total required grade points across all courses to reach the target SGPA.
    2. Distribute the necessary 'required scores' for the pending assessments in each course.
    3. Ensure the required scores are realistic (never exceeding the 'max' limit for that assessment).
    
    Return ONLY a raw JSON array of objects with these keys: 
    - course_code
    - assessment_name
    - required_score (float, 1 decimal place)
    
    Output example: [{{"course_code": "CS101", "assessment_name": "Major Exam", "required_score": 28.5}}]
    If it's mathematically impossible, return an empty array.
    """
    
    predictions = []
    for key in api_keys:
        try:
            client = genai.Client(api_key=key)
            resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            raw_text = resp.text.strip().replace("```json", "").replace("```", "").strip()
            predictions = json.loads(raw_text)
            break
        except Exception as e:
            print(f"Key failed in Oracle, rotating... Error: {e}")
    else:
        # Fallback if AI fails
        predictions = []

    return {"status": "success", "predictions": predictions}

@app.patch("/api/assessments/{assessment_id}")
async def update_assessment(assessment_id: int, req: AssessmentUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Quiz).where(Quiz.id == assessment_id))
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    quiz.score = int(req.score)
    quiz.status = "Graded"
    session.add(quiz)
    await session.commit()
    await session.refresh(quiz)
    
    # Recalculate Mark.score
    marks_result = await session.execute(
        select(Mark)
        .where(Mark.student_id == quiz.student_id)
        .where(Mark.course_id == quiz.course_id)
    )
    mark = marks_result.scalars().first()
    if mark:
        all_quizzes_res = await session.execute(
            select(Quiz)
            .where(Quiz.student_id == quiz.student_id)
            .where(Quiz.course_id == quiz.course_id)
        )
        all_quizzes = all_quizzes_res.scalars().all()
        new_total = sum([q.score for q in all_quizzes if q.score is not None])
        mark.score = float(new_total)
        session.add(mark)
        await session.commit()
    
    return {"status": "success", "new_total": mark.score if mark else None}

@app.get("/api/courses")
async def get_all_courses(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Course))
    courses = result.scalars().all()
    return [{"id": c.id, "code": c.code, "title": c.title} for c in courses]

@app.post("/api/timetable/upload")
async def parse_timetable(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    """
    Accepts a PDF or Image, uploads it to Gemini, and extracts structured timetable data.
    """
    if not file.filename.endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PDF and images are supported.")

    try:
        # 1. Save file temporarily
        suffix = f".{file.filename.split('.')[-1]}"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # 2. Upload to Gemini via the File API
        # We use the first available key for this operation
        client = genai.Client(api_key=api_keys[0])
        uploaded_file = client.files.upload(path=temp_path)

        # 3. Prompt Gemini to strictly output JSON
        prompt = """
        You are an expert academic parser. Analyze this uploaded timetable/syllabus.
        Extract the class schedule and return ONLY a valid JSON array of objects with the following keys:
        - "day": String (e.g., "Monday")
        - "course_code": String (e.g., "CS301")
        - "course_name": String (e.g., "Operating Systems")
        - "start_time": String (e.g., "10:00 AM")
        - "end_time": String (e.g., "11:30 AM")
        - "room": String (or "N/A" if not provided)
        
        Rules:
        - If 'course_code' is missing but 'course_name' is present, try to infer the code or use a slugified version.
        - Return ONLY a raw JSON array. No markdown blocks.
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[uploaded_file, prompt]
        )
        
        # Cleanup temp file and Gemini file
        os.remove(temp_path)
        try:
            client.files.delete(name=uploaded_file.name)
        except:
            pass

        # 4. Parse the JSON response
        try:
            raw_text = response.text.replace('```json', '').replace('```', '').strip()
            parsed_data = json.loads(raw_text)
            
            slots_created = 0
            for item in parsed_data:
                code = item.get("course_code", "GEN101")
                title = item.get("course_name", "General Course")
                
                # Find or Create Course
                res = await session.execute(select(Course).where(Course.code == code))
                course = res.scalars().first()
                if not course:
                    course = Course(code=code, title=title, credits=3)
                    session.add(course)
                    await session.commit()
                    await session.refresh(course)
                
                slot = TimetableSlot(
                    course_id=course.id,
                    day_of_week=item.get("day"),
                    start_time=item.get("start_time"),
                    end_time=item.get("end_time"),
                    room_number=item.get("room", "N/A")
                )
                session.add(slot)
                slots_created += 1
            
            await session.commit()
            return {"status": "success", "slots_created": slots_created, "data": parsed_data}
        
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse Gemini output as JSON.")

    except Exception as e:
        print(f"Extraction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assignments/manual")
async def add_manual_assignment(data: dict, session: AsyncSession = Depends(get_session)):
    try:
        new_assignment = Assignment(
            title=data.get("title"),
            due_date=datetime.fromisoformat(data.get("due_date").replace('Z', '+00:00')),
            status="Pending",
            student_id=data.get("student_id"),
            course_id=data.get("course_id")
        )
        session.add(new_assignment)
        await session.commit()
        return {"status": "success", "message": "Assignment added manually."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
