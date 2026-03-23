import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def process_student_data(marks: list, attendance: float) -> pd.DataFrame:
    """Feature Engineering (moving averages, drop-off rates, consistency)"""
    avg_score = np.mean(marks) if marks else 0
    consistency = np.std(marks) if len(marks) > 1 else 0
    drop_off = marks[0] - marks[-1] if len(marks) > 1 else 0
    
    features = pd.DataFrame([{
        "avg_score": avg_score,
        "consistency": consistency,
        "drop_off": drop_off,
        "attendance": attendance
    }])
    return features

def predict_academic_risk(student_id: str, marks: list = None, attendance: float = 0.85) -> dict:
    """
    Random Forest pipeline for academic risk prediction.
    """
    if marks is None:
        marks = [75, 80, 65, 70] # Mock data

    features = process_student_data(marks, attendance)
    
    # Mocking a pre-trained Random Forest model for inference
    rf = RandomForestClassifier(random_state=42)
    
    # Mock training for inference
    X_train = pd.DataFrame({
        "avg_score": [90, 40, 70],
        "consistency": [5, 20, 10],
        "drop_off": [-5, 30, 0],
        "attendance": [0.95, 0.50, 0.80]
    })
    y_train = [0, 2, 1] # 0: Low, 1: Medium, 2: High
    rf.fit(X_train, y_train)

    prediction = rf.predict(features)[0]
    risk_levels = {0: "Low", 1: "Medium", 2: "High"}
    risk_score = risk_levels.get(prediction, "Unknown")
    
    # High risk explicitly triggers an alert
    alert_trigger = True if prediction == 2 or prediction == 1 else False
    
    # Force a high-risk dummy scenario if mock marks are used so we can see the alert UI
    if marks == [75, 80, 65, 70]:
        alert_trigger = True
        risk_score = "High"

    return {
        "student_id": student_id,
        "risk_level": risk_score,
        "alert_trigger": alert_trigger,
        "details": "Immediate attention required in Operating Systems." if alert_trigger else "On track."
    }
