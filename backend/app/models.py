import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, JSON, Boolean
from .database import Base


def gen_id():
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, default="")
    password_hash = Column(String, nullable=True)  # null until the invited user sets a password
    role = Column(String, default="staff")  # admin | manager | staff | viewer
    invited = Column(Boolean, default=False)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Record(Base):
    """Generic entity store. One table backs every Base44-style entity
    (Cattle, MilkProduction, HealthRecord, ...). `entity_type` selects the
    logical collection and `data` holds the entity's fields as JSON, mirroring
    the schema-less shape the entities had under Base44."""

    __tablename__ = "records"

    id = Column(String, primary_key=True, default=gen_id)
    entity_type = Column(String, index=True, nullable=False)
    data = Column(JSON, default=dict)
    created_by_id = Column(String, index=True, nullable=True)
    created_by_email = Column(String, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PageView(Base):
    __tablename__ = "page_views"

    id = Column(String, primary_key=True, default=gen_id)
    page = Column(String)
    user_id = Column(String, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)
