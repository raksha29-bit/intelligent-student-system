import asyncio
import random
import json
from faker import Faker
from sqlmodel import select, delete
from app.core.database import get_session
from app.models import User, Course, Mark, ChatHistory, Assignment, TimetableSlot, Exam, Quiz
from passlib.context import CryptContext
from datetime import timezone, datetime, timedelta

fake = Faker()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# AIML 3rd Semester Courses
COURSES = [
    {"code": "CS301", "title": "Design and Analysis of Algorithms (DAA)", "credits": 4},
    {"code": "MA302", "title": "Probability and Random Processes", "credits": 4},
    {"code": "AI303", "title": "Introduction to Machine Learning", "credits": 3},
    {"code": "CS304", "title": "Database Management Systems", "credits": 4},
    {"code": "CS301L", "title": "DAA Lab", "credits": 1},
]

def get_password_hash(password):
    return pwd_context.hash(password)

async def seed_data():
    async for session in get_session():
        print("Clearing old database records...")
        # Clear in order of dependencies
        await session.execute(delete(ChatHistory))
        await session.execute(delete(Mark))
        await session.execute(delete(Assignment))
        await session.execute(delete(Quiz))
        await session.execute(delete(Exam))
        await session.execute(delete(TimetableSlot))
        await session.execute(delete(User))
        await session.execute(delete(Course))
        await session.commit()
        print("Database cleared.")

        print("Starting database seeding...")
        
        # 1. Create Courses
        db_courses = []
        for c_data in COURSES:
            course = Course(**c_data)
            session.add(course)
            db_courses.append(course)
        await session.commit()
        
        # Fetch inserted courses to get their IDs
        result = await session.execute(select(Course))
        db_courses = result.scalars().all()
        print(f"Added {len(db_courses)} Courses.")

        # 2. Add Timetable Slots & Exams for Courses
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        times = [("09:00", "10:00"), ("10:15", "11:15"), ("11:30", "12:30"), ("14:00", "15:00")]
        
        for course in db_courses:
            # 2 slots per course
            for _ in range(2):
                slot = TimetableSlot(
                    course_id=course.id,
                    day_of_week=random.choice(days),
                    start_time=random.choice(times)[0],
                    end_time=random.choice(times)[1],
                    room_number=f"LH-{random.randint(101, 505)}"
                )
                session.add(slot)
            
            # Midterm and Final Exam
            midterm = Exam(
                course_id=course.id,
                title="Midterm Examination",
                exam_date=datetime.now(timezone.utc) + timedelta(days=random.randint(10, 20)),
                duration_minutes=90,
                location="Main Hall"
            )
            final = Exam(
                course_id=course.id,
                title="Final Semester Examination",
                exam_date=datetime.now(timezone.utc) + timedelta(days=random.randint(40, 60)),
                duration_minutes=180,
                location="Examination Wing"
            )
            session.add(midterm)
            session.add(final)
        
        await session.commit()
        print(f"Added Timetable Slots and Exams.")

        # 3. Create Users (Students)
        students = []
        
        # Explicit Demo Administrator Student
        admin_student = User(
            username="admin",
            email="admin@mits.edu",
            hashed_password=get_password_hash("password"),
            role="student",
            branch="AIML"
        )
        session.add(admin_student)
        students.append(admin_student)

        # 50 Dummy Students
        for _ in range(50):
            student = User(
                username=fake.unique.user_name(),
                email=fake.unique.email(),
                hashed_password=get_password_hash("password"),
                role="student",
                branch=random.choice(["AIML", "Computer Science Engineering", "Information Technology", "Electronics & Communication"])
            )
            session.add(student)
            students.append(student)
        await session.commit()

        # Fetch inserted students
        result = await session.execute(select(User).where(User.role == "student"))
        students = result.scalars().all()
        print(f"Added {len(students)} Students (including 'admin').")

        # 4. Create Marks, Quizzes, Assignments, and Chat History
        at_risk_count = int(len(students) * 0.15) # 15% at risk
        at_risk_students = random.sample(students, at_risk_count)

        for student in students:
            is_at_risk = student in at_risk_students
            
            for course in db_courses:
                # MARK GENERATION
                mark_type = "lab" if "Lab" in course.title else "theory"
                max_score = 100.0 if mark_type == "theory" else 50.0
                
                if is_at_risk:
                    score = random.uniform(0.2, 0.45) * max_score
                else:
                    score = random.uniform(0.65, 0.98) * max_score

                mark = Mark(
                    score=round(score, 1),
                    max_score=max_score,
                    type=mark_type,
                    student_id=student.id,
                    course_id=course.id
                )
                session.add(mark)

                # QUIZ GENERATION (2 per course)
                for i in range(1, 3):
                    q_score = random.randint(3, 10) if is_at_risk else random.randint(12, 20)
                    quiz = Quiz(
                        course_id=course.id,
                        student_id=student.id,
                        title=f"Quiz {i}: {course.code} Fundamentals",
                        total_questions=20,
                        score=q_score,
                        status="Completed"
                    )
                    session.add(quiz)

                # ASSIGNMENT GENERATION (2 per course)
                for i in range(1, 3):
                    status_choices = ["Pending", "Submitted", "Graded"]
                    status = random.choices(status_choices, weights=[0.2, 0.5, 0.3])[0]
                    assignment = Assignment(
                        title=f"Lab Assignment {i}" if mark_type == "lab" else f"Problem Set {i}",
                        due_date=datetime.now(timezone.utc) + timedelta(days=random.randint(-10, 10)),
                        status=status,
                        student_id=student.id,
                        course_id=course.id
                    )
                    session.add(assignment)

            # CHAT HISTORY
            chat = ChatHistory(
                message=f"How can I improve my performance in {random.choice(db_courses).title}?",
                sender="user",
                user_id=student.id
            )
            session.add(chat)

        await session.commit()
        print("Added Marks, Quizzes, Assignments, and Chat History.")

        print("\n" + "="*40)
        print("MASS RESURRECTION COMPLETE!")
        print("="*40)
        print(f"Total Students: {len(students)}")
        print(f"Demo Account: admin / password")
        print("="*40)
        break 

if __name__ == "__main__":
    asyncio.run(seed_data())
