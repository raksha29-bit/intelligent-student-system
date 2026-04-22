import sqlite3

DB_FILE = "luminary.db"

def check_student_tiers():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    print("🔍 Scanning Luminary Database for Student Profiles...\n")

    try:
        # 1. RED ALERT (At-Risk Students)
        # Calculates their percentage based on Graded exams. Assuming < 40% is At-Risk.
        print("🚨 RED ALERT (At-Risk Students - Average < 40%):")
        cursor.execute('''
            SELECT u.username, ROUND(AVG(CAST(q.score AS FLOAT) / q.total_questions * 100), 2) as avg_percentage
            FROM user u
            JOIN quiz q ON u.id = q.student_id
            WHERE q.status = 'Graded' AND u.role = 'student'
            GROUP BY u.id
            HAVING avg_percentage < 40
            LIMIT 5
        ''')
        at_risk = cursor.fetchall()
        if not at_risk: print("  (No students found in this tier)")
        for row in at_risk:
            print(f"  - Username: {row[0]} | Average Score: {row[1]}%")

        # 2. INCOMPLETE DATA (Some Exams Graded, Some Pending)
        # Perfect for testing your Sparse Data ML Fallback!
        print("\n⚠️ INCOMPLETE DATA (Sparse Data / Fallback Test Targets):")
        cursor.execute('''
            SELECT u.username, 
                   SUM(CASE WHEN q.status = 'Graded' THEN 1 ELSE 0 END) as graded_count,
                   SUM(CASE WHEN q.status = 'Pending' THEN 1 ELSE 0 END) as pending_count
            FROM user u
            JOIN quiz q ON u.id = q.student_id
            WHERE u.role = 'student'
            GROUP BY u.id
            HAVING graded_count > 0 AND pending_count > 0
            LIMIT 5
        ''')
        incomplete = cursor.fetchall()
        if not incomplete: print("  (No students found in this tier)")
        for row in incomplete:
            print(f"  - Username: {row[0]} | {row[1]} Graded, {row[2]} Pending")

        # 3. FULLY GRADED (All Exams Complete)
        # Perfect for testing the full Scikit-Learn Random Forest prediction.
        print("\n✅ FULLY GRADED (All Exams Complete):")
        cursor.execute('''
            SELECT u.username, COUNT(q.id) as total_exams
            FROM user u
            JOIN quiz q ON u.id = q.student_id
            WHERE u.role = 'student'
            GROUP BY u.id
            HAVING SUM(CASE WHEN q.status = 'Pending' THEN 1 ELSE 0 END) = 0
            LIMIT 5
        ''')
        complete = cursor.fetchall()
        if not complete: print("  (No students found in this tier)")
        for row in complete:
            print(f"  - Username: {row[0]} | {row[1]} Total Exams, 0 Pending")

    except Exception as e:
        print(f"❌ Error reading database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_student_tiers()
