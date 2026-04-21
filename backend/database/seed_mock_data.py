import random
import sys
import os
import bcrypt
from datetime import datetime, timezone
from sqlmodel import Session, create_engine, SQLModel, select

# Adjust path to import app models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import User, Course, Mark, Quiz, Assignment, TimetableSlot, Exam

DB_FILE = "luminary.db"
# Use absolute path for the DB file if running from different directories
# But assuming we run from 'backend' directory or root
DB_URL = f"sqlite:///./{DB_FILE}"

engine = create_engine(DB_URL, echo=False)

# --- Mock Data Sources ---
INDIAN_NAMES = [
    "Arjun Sharma", "Priya Patel", "Vikram Singh", "Ananya Iyer", "Rohan Gupta",
    "Ishani Reddy", "Amit Das", "Sneha Rao", "Kartik Nair", "Kavya Menon",
    "Manish Verma", "Meera Krishnan", "Sanjay Joshi", "Ria Malhotra", "Kunal Shah",
    "Tanvi Kulkarni", "Shlok Pandey", "Aditya Bose", "Anjali Saxena", "Rahul Mishra"
]

INTERNATIONAL_NAMES = [
    "Alice Johnson", "Bob Smith", "Charlie Brown", "David Wilson", "Eve Davis",
    "Frank Miller", "Grace Taylor", "Heidi Anderson", "Ivan Thomas", "Judy Garcia",
    "Mallory Martinez", "Nels Robinson", "Oscar Clark", "Peggy Rodriguez", "Quinn Lewis",
    "Robert Lee", "Sybil Walker", "Trent Hall", "Ursula Young", "Victor King",
    "Leo White", "Mia Harris", "Noah Martin", "Sophia Thompson", "Jack Wright"
]

COURSES = [
    {"code": "CS301", "title": "Machine Learning", "credits": 4},
    {"code": "CS302", "title": "Cloud Computing", "credits": 3},
    {"code": "CS303", "title": "AI Ethics & Society", "credits": 2},
    {"code": "CS304", "title": "Database Systems", "credits": 4},
    {"code": "CS305", "title": "Web Development", "credits": 3}
]

def get_realistic_name():
    all_names = INDIAN_NAMES + INTERNATIONAL_NAMES
    return random.choice(all_names)

def seed_data():
    print("🚀 Initializing mock data generation...")
    
    # Drop and recreate tables
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Seed Courses
        db_courses = []
        for c_data in COURSES:
            course = Course(
                code=c_data["code"],
                title=c_data["title"],
                credits=c_data["credits"],
                syllabus_topics='["Unit 1: Foundations", "Unit 2: Implementation", "Unit 3: Optimization"]'
            )
            session.add(course)
            db_courses.append(course)
        session.commit()
        for c in db_courses: session.refresh(c)
        print(f"✅ Seeded {len(db_courses)} courses.")

        # 3. Seed Timetable Slots (Course-wide)
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        rooms = ["LH-101", "LH-202", "CS-LAB-1", "PH-3", "RD-HALL"]
        slot_count = 0
        for i, course in enumerate(db_courses):
            # Create 2 slots per course on different days
            for d_idx in range(2):
                day = days[(i + d_idx) % 5]
                slot = TimetableSlot(
                    course_id=course.id,
                    day_of_week=day,
                    start_time=f"{9 + i}:00 AM",
                    end_time=f"{10 + i}:30 AM",
                    room_number=rooms[i % len(rooms)]
                )
                session.add(slot)
                slot_count += 1
        print(f"✅ Seeded {slot_count} timetable slots.")

        # 4. Seed Exams (Course-wide)
        exam_count = 0
        for course in db_courses:
            # Past Exams
            for j in range(2):
                past_exam = Exam(
                    course_id=course.id,
                    title=f"Sessional Test {j+1}",
                    exam_date=datetime(2026, 3, 10 + j, 10, 0, tzinfo=timezone.utc),
                    duration_minutes=90,
                    location="Main Hall"
                )
                session.add(past_exam)
                exam_count += 1
            # Upcoming Exam
            upcoming_exam = Exam(
                course_id=course.id,
                title="End Semester Evaluation",
                exam_date=datetime(2026, 5, 20, 14, 0, tzinfo=timezone.utc),
                duration_minutes=180,
                location="Examination Block A"
            )
            session.add(upcoming_exam)
            exam_count += 1
        print(f"✅ Seeded {exam_count} exams.")

        session.commit()

        # 5. Seed Students and Assignments
        hashed_password = bcrypt.hashpw("password".encode('utf-8'), bcrypt.gensalt()).decode()
        
        # Tracks for reporting
        counts = {"High": 0, "Medium": 0, "At-Risk": 0, "Incomplete": 0}
        total_assignments = 0
        
        # Helper to create quizzes
        def create_quizzes(student_id, course_id, target_range, is_incomplete=False):
            # Scheme: Minor I (25), Minor II (25), Quiz (20), Major (30)
            assessments = [
                ("Minor Evaluation I", 25),
                ("Minor Evaluation II", 25),
                ("Quiz/Assignment", 20),
                ("Major Evaluation", 30)
            ]
            
            if is_incomplete:
                num_papers = random.randint(1, 2)
                assessments = assessments[:num_papers]
            
            total_score = 0
            for title, max_m in assessments:
                is_major = "Major" in title
                should_be_pending = is_major and random.random() > 0.7
                
                if should_be_pending:
                    score = None
                    status = "Pending"
                else:
                    base_percent = random.uniform(target_range[0], target_range[1])
                    score = round((base_percent / 100) * max_m)
                    status = "Graded"
                    total_score += score
                
                quiz = Quiz(
                    course_id=course_id,
                    student_id=student_id,
                    title=title,
                    total_questions=max_m,
                    score=score,
                    status=status
                )
                session.add(quiz)
            return total_score

        # Generation Config
        student_configs = [
            ("High", 15, (80, 100)),
            ("Medium", 20, (55, 75)),
            ("At-Risk", 10, (30, 48)),
            ("Incomplete", 10, (40, 90))
        ]

        total_students = 0
        student_list = []
        for tier, count, score_range in student_configs:
            for _ in range(count):
                name = get_realistic_name()
                username = f"{name.lower().replace(' ', '_')}_{random.randint(100, 999)}"
                user = User(
                    username=username,
                    email=f"{username}@university.edu",
                    hashed_password=hashed_password,
                    role="student",
                    branch="AIML"
                )
                session.add(user)
                session.commit()
                session.refresh(user)
                student_list.append(user)
                
                num_courses = random.randint(3, 5)
                enrolled_courses = random.sample(db_courses, num_courses)
                
                for course in enrolled_courses:
                    is_inc = (tier == "Incomplete")
                    total_course_score = create_quizzes(user.id, course.id, score_range, is_inc)
                    
                    mark = Mark(
                        score=float(total_course_score) if not is_inc else None,
                        max_score=100.0,
                        type="theory",
                        student_id=user.id,
                        course_id=course.id
                    )
                    session.add(mark)

                    # Add Assignments for the first 10 students
                    if total_students < 10:
                        # 3-5 Pending
                        for a_idx in range(random.randint(3, 5)):
                            assignment = Assignment(
                                title=f"Homework assignment {a_idx + 1}",
                                due_date=datetime(2026, 5, 1 + a_idx, 23, 59, tzinfo=timezone.utc),
                                status="Pending",
                                student_id=user.id,
                                course_id=course.id
                            )
                            session.add(assignment)
                            total_assignments += 1
                        # 2 Completed
                        for a_idx in range(2):
                            assignment = Assignment(
                                title=f"Lab Report {a_idx + 1}",
                                due_date=datetime(2026, 4, 1 + a_idx, 23, 59, tzinfo=timezone.utc),
                                status="Graded" if random.random() > 0.5 else "Submitted",
                                student_id=user.id,
                                course_id=course.id
                            )
                            session.add(assignment)
                            total_assignments += 1
                
                counts[tier] += 1
                total_students += 1

        session.commit()
        print(f"✅ Seeded {total_assignments} assignments for the top 10 students.")
        print("\n" + "="*30)
        print("🎉 UI-CENTRIC MOCK DATA SEEDING COMPLETE")
        print("="*30)
        print(f"Total Students: {total_students}")
        for tier, count in counts.items():
            print(f"- {tier:10}: {count}")
        print("="*30)
        print(f"Success! SQLite database '{DB_FILE}' populated for demo dashboards.")

if __name__ == "__main__":
    seed_data()
