import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = Path(__file__).parent / "data" / "zero_balance.db"
DB_PATH.parent.mkdir(exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


class AuditLogEntry(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entry_type = Column(String, nullable=False)  # "evaluation" | "override" | "config_change"
    batch_id = Column(String, nullable=True)
    account_id = Column(String, nullable=True)
    rim_number = Column(String, nullable=True)
    recommendation = Column(String, nullable=True)
    close_score = Column(Float, nullable=True)
    confidence = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    criteria_breakdown = Column(Text, nullable=True)  # JSON
    hard_override_applied = Column(String, nullable=True)
    config_version = Column(String, nullable=True)
    config_snapshot = Column(Text, nullable=True)  # JSON
    overridden_by = Column(String, nullable=True)
    override_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
