import uuid
from sqlalchemy import String, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    audio_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        server_default="manual",
    )

    provider_meeting_id: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    start_time: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )