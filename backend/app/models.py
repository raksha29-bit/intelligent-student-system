from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime, timezone

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default="student") # 'student' or 'faculty'
    branch: str = Field(default="AIML")
    saved_roadmap: Optional[str] = Field(default=None)
    
    marks: List["Mark"] = Relationship(back_populates="student")
    chats: List["ChatHistory"] = Relationship(back_populates="user")
    assignments: List["Assignment"] = Relationship(back_populates="student")
    quizzes: List["Quiz"] = Relationship(back_populates="student")

class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True) # e.g., 'CS301'
    title: str
    credits: int
    syllabus_topics: Optional[str] = Field(default=None)

    marks: List["Mark"] = Relationship(back_populates="course")
    assignments: List["Assignment"] = Relationship(back_populates="course")
    timetable_slots: List["TimetableSlot"] = Relationship(back_populates="course")
    exams: List["Exam"] = Relationship(back_populates="course")
    quizzes: List["Quiz"] = Relationship(back_populates="course")

class Mark(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    score: Optional[float] = Field(default=None)
    max_score: float = Field(default=100.0)
    type: str # 'theory', 'lab', 'assignment'
    
    student_id: int = Field(foreign_key="user.id")
    course_id: int = Field(foreign_key="course.id")
    
    student: User = Relationship(back_populates="marks")
    course: Course = Relationship(back_populates="marks")

class ChatHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message: str
    sender: str # 'user' or 'ai'
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="chats")

class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    due_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="Pending") # 'Pending', 'Submitted', 'Graded'
    
    student_id: int = Field(foreign_key="user.id")
    course_id: int = Field(foreign_key="course.id")
    
    student: User = Relationship(back_populates="assignments")
    course: Course = Relationship(back_populates="assignments")

class TimetableSlot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id")
    day_of_week: str 
    start_time: str 
    end_time: str 
    room_number: str
    
    course: Course = Relationship(back_populates="timetable_slots")

class Exam(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id")
    title: str 
    exam_date: datetime
    duration_minutes: int
    location: str
    
    course: Course = Relationship(back_populates="exams")

class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id")
    student_id: int = Field(foreign_key="user.id")
    title: str
    total_questions: int
    score: Optional[int] = Field(default=None)
    status: str
    
    course: Course = Relationship(back_populates="quizzes")
    student: User = Relationship(back_populates="quizzes")
