from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

# Use SQLite for local development
DATABASE_URL = "sqlite+aiosqlite:///./luminary.db"

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
