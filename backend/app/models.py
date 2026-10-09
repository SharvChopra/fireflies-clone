from __future__ import annotations

from datetime import date, datetime, timezone
from typing import List

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    full_transcript: Mapped[str] = mapped_column(
        Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="completed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("title", "meeting_date",
                         name="uq_meeting_title_date"),
    )

    participants: Mapped[List["Participant"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    transcript_segments: Mapped[List["TranscriptSegment"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    summaries: Mapped[List["Summary"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    action_items: Mapped[List["ActionItem"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    topics: Mapped[List["MeetingTopic"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")
    transcript_segments: Mapped[List["TranscriptSegment"]] = relationship(
        back_populates="participant",
        cascade="all, delete-orphan",
    )
    action_items: Mapped[List["ActionItem"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("meeting_id", "email",
                         name="uq_participant_meeting_email"),
    )


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), nullable=False, index=True)
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id"), nullable=True)
    speaker_name: Mapped[str] = mapped_column(String(150), nullable=False)
    start_time: Mapped[str] = mapped_column(String(20), nullable=False)
    end_time: Mapped[str] = mapped_column(String(20), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    meeting: Mapped["Meeting"] = relationship(
        back_populates="transcript_segments")
    participant: Mapped["Participant | None"] = relationship(
        back_populates="transcript_segments"
    )


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="summaries")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), nullable=False, index=True)
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id"), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="open",
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'in_progress', 'done', 'blocked')", name="ck_action_status"),
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="action_items")
    owner: Mapped["Participant | None"] = relationship(
        back_populates="action_items")


class MeetingTopic(Base):
    __tablename__ = "meeting_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="topics")
