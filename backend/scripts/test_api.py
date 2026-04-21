import asyncio
from sqlmodel import select
from app.core.database import get_session, engine
from app.models import User
from fastapi.testclient import TestClient
from main import app

async def test_db_and_api():
    print("Testing DB Connection to get a test user...")
    async for session in get_session():
        result = await session.execute(select(User).where(User.role == "student"))
        first_user = result.scalars().first()
        break
        
    if not first_user:
        print("No users found in database.")
        return
        
    username = first_user.username
    password = "password123" # Hardcoded in our seed.py logic
    user_id = first_user.id
    print(f"Got Test User: {username}")
    
    print("\n--- Testing /api/login ---")
    client = TestClient(app)
    # The endpoints in main.py use FastAPI's normal routing but async routes under TestClient are handled by AnyIO.
    # We must ensure TestClient works gracefully here.
    try:
        response = client.post("/api/login", json={"username": username, "password": password})
        print("Status Code:", response.status_code)
        print("Response JSON:", response.json())
        assert response.status_code == 200
    except Exception as e:
        print("Login Test Failed:", str(e))
        
    print(f"\n--- Testing /api/dashboard/{user_id} ---")
    try:
        response = client.get(f"/api/dashboard/{user_id}")
        print("Status Code:", response.status_code)
        
        data = response.json()
        print("User Data:", data.get("user"))
        print(f"Marks Count: {len(data.get('marks', []))}")
        if data.get("marks"):
            print("First Mark Example:", data.get("marks")[0])
        assert response.status_code == 200
    except Exception as e:
        print("Dashboard Test Failed:", str(e))

if __name__ == "__main__":
    asyncio.run(test_db_and_api())
