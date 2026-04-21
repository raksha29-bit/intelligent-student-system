import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sqlmodel import select
from app.models import Quiz, Course

async def train_and_predict_risk(student_id: int, session):
    try:
        # Fetch all graded quizzes across the system for training
        res = await session.execute(select(Quiz).where(Quiz.status == "Graded"))
        all_graded = res.scalars().all()
        
        if not all_graded:
            return await get_fallback_prediction(student_id, session)

        # Build training set: X = (Minor/Quiz scores), y = (Major score)
        # Group by (student_id, course_id)
        data_map = {}
        for q in all_graded:
            key = (q.student_id, q.course_id)
            if key not in data_map:
                data_map[key] = {"early": [], "late": None}
            
            # Heuristic: Title contains 'Major' is late, others are early
            if "major" in q.title.lower() or "final" in q.title.lower():
                data_map[key]["late"] = (q.score / q.total_questions) * 100
            else:
                data_map[key]["early"].append((q.score / q.total_questions) * 100)

        # Filter for pairs where we have both early and late
        training_rows = []
        for key, val in data_map.items():
            if val["early"] and val["late"] is not None:
                training_rows.append({
                    "avg_early": np.mean(val["early"]),
                    "final": val["late"]
                })

        # If data is sparse, use fallback
        if len(training_rows) < 3:
            return await get_fallback_prediction(student_id, session)

        df = pd.DataFrame(training_rows)
        X = df[["avg_early"]]
        y = df["final"]

        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        # Predict for current student's pending courses
        # 1. Find courses student is enrolled in
        # 2. For each course, find average of graded early quizzes
        # 3. Predict final
        
        pending_res = await session.execute(select(Quiz).where(Quiz.student_id == student_id))
        all_student_quizzes = pending_res.scalars().all()
        
        student_courses = {}
        for q in all_student_quizzes:
            if q.course_id not in student_courses:
                student_courses[q.course_id] = {"graded_early": [], "has_pending_major": False}
            
            if q.score is not None:
                if not ("major" in q.title.lower() or "final" in q.title.lower()):
                    student_courses[q.course_id]["graded_early"].append((q.score / q.total_questions) * 100)
            else:
                if "major" in q.title.lower() or "final" in q.title.lower():
                    student_courses[q.course_id]["has_pending_major"] = True

        predictions = []
        for c_id, stats in student_courses.items():
            if stats["has_pending_major"] and stats["graded_early"]:
                inp = [[np.mean(stats["graded_early"])]]
                pred = model.predict(inp)[0]
                
                c_res = await session.execute(select(Course).where(Course.id == c_id))
                course = c_res.scalar_one()
                
                predictions.append({
                    "course_code": course.code,
                    "course_name": course.title,
                    "predicted_score": round(pred, 1),
                    "confidence": "High (ML)"
                })

        if not predictions:
            return await get_fallback_prediction(student_id, session)

        return predictions

    except Exception as e:
        print(f"ML Engine Error: {e}")
        return await get_fallback_prediction(student_id, session)

async def get_fallback_prediction(student_id: int, session):
    # Fallback: 85% of early average as prediction
    res = await session.execute(select(Quiz).where(Quiz.student_id == student_id))
    all_q = res.scalars().all()
    
    courses = {}
    for q in all_q:
        if q.course_id not in courses:
            courses[q.course_id] = {"scores": [], "pending": False}
        if q.score is not None:
            courses[q.course_id]["scores"].append((q.score / q.total_questions) * 100)
        elif "major" in q.title.lower() or "final" in q.title.lower():
            courses[q.course_id]["pending"] = True
            
    preds = []
    for c_id, stats in courses.items():
        if stats["pending"] and stats["scores"]:
            c_res = await session.execute(select(Course).where(Course.id == c_id))
            course = c_res.scalar_one()
            avg = np.mean(stats["scores"])
            preds.append({
                "course_code": course.code,
                "course_name": course.title,
                "predicted_score": round(avg * 0.9, 1),
                "confidence": "Estimated (Sparse Data)"
            })
    return preds
