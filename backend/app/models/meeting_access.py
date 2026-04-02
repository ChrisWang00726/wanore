import uuid
from sqlalchemy import String,DateTime,ForeignKey,func,UniqueConstraint,Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped,mapped_column

from app.db.base import Base

class MeetingAccess(Base):
    __tablename__="meeting_access"

    id:Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)

    meeting_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id",ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    shared_email:Mapped[str]=mapped_column(String(320),nullable=False)

    created_at:Mapped[DateTime]=mapped_column(DateTime(timezone=True),server_default=func.now(),nullable=False)

    __table_args__=(
        UniqueConstraint("meeting_id","shared_email",name="uq_meeting_access_meeting_email"),
        Index("ix_meeting_access_shared_email","shared_email"),
    )