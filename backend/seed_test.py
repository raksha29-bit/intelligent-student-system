import sqlite3
import os
import bcrypt

DB_FILE = "luminary.db"

def seed_database():
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file '{DB_FILE}' not found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        print("Cleaning up old test data...")
        # Delete old student and their associated data (Cascaded delete would be better, but we'll do specific cleanup)
        cursor.execute("SELECT id FROM user WHERE username = 'ml_test_student'")
        user_row = cursor.fetchone()
        if user_row:
            uid = user_row[0]
            cursor.execute("DELETE FROM quiz WHERE student_id = ?", (uid,))
            cursor.execute("DELETE FROM mark WHERE student_id = ?", (uid,))
            cursor.execute("DELETE FROM user WHERE id = ?", (uid,))

        # Delete the courses if they exist to avoid unique constraint errors
        cursor.execute("DELETE FROM course WHERE code IN ('28242201', '28242202')")
        
        print("Seeding accurate MITS Scheme data...")
        
        # 1. Create a Dummy Student with Bcrypt Hash
        hashed_pw = bcrypt.hashpw(b'password', bcrypt.gensalt()).decode()
        cursor.execute('''
            INSERT INTO user (username, email, hashed_password, role, branch) 
            VALUES ('ml_test_student', 'test@mits.edu', ?, 'student', 'AIML')
        ''', (hashed_pw,))
        student_id = cursor.lastrowid

        # 2. Create Two Theory Courses
        courses = [
            ("28242201", "Machine Learning", 3),
            ("28242202", "Theory of Computation", 3)
        ]
        
        for code, title, credits in courses:
            # Insert Course
            cursor.execute('''
                INSERT INTO course (code, title, credits, syllabus_topics) 
                VALUES (?, ?, ?, '["Unit 1", "Unit 2"]')
            ''', (code, title, credits))
            course_id = cursor.lastrowid
            
            # Create Mark entry to link student and course
            cursor.execute('''
                INSERT INTO mark (score, max_score, type, student_id, course_id) 
                VALUES (18, 100, 'theory', ?, ?)
            ''', (student_id, course_id))

            # 3. Insert EXACT Syllabus Assessments (25-25-20-30)
            # Minor 1: Graded (18/25)
            cursor.execute('''
                INSERT INTO quiz (course_id, student_id, title, total_questions, score, status) 
                VALUES (?, ?, 'Minor Evaluation I', 25, 18, 'Graded')
            ''', (course_id, student_id))
            
            # Minor 2: Pending (NULL score)
            cursor.execute('''
                INSERT INTO quiz (course_id, student_id, title, total_questions, score, status) 
                VALUES (?, ?, 'Minor Evaluation II', 25, NULL, 'Pending')
            ''', (course_id, student_id))
            
            # Quiz/Assignment: Pending (NULL score)
            cursor.execute('''
                INSERT INTO quiz (course_id, student_id, title, total_questions, score, status) 
                VALUES (?, ?, 'Quiz/Assignment', 20, NULL, 'Pending')
            ''', (course_id, student_id))
            
            # Major Evaluation: Pending (NULL score)
            cursor.execute('''
                INSERT INTO quiz (course_id, student_id, title, total_questions, score, status) 
                VALUES (?, ?, 'Major Evaluation', 30, NULL, 'Pending')
            ''', (course_id, student_id))

        conn.commit()
        print("Success! MITS Theory Scheme applied. Log in as 'ml_test_student' with password 'password'.")

    except Exception as e:
        print(f"Database error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_database()
