from datetime import date
import re

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import delete, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .database import SessionLocal, get_db, init_db
from .models import ActionItem, Meeting, Participant, Summary, TranscriptSegment
from .transcript_parser import parse_transcript_segments

app = FastAPI(title="Fireflies Clone API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParticipantPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=120)


class MeetingCreatePayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    meeting_date: date
    duration_minutes: int = Field(..., gt=0)
    status: str = "completed"
    full_transcript: str = Field(..., min_length=1)
    participants: list[ParticipantPayload] = Field(default_factory=list)
    summary: str | None = None


class ParticipantUpdatePayload(BaseModel):
    id: int | None = Field(default=None, gt=0)
    name: str = Field(..., min_length=1, max_length=150)
    email: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=120)


class MeetingUpdatePayload(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    meeting_date: date | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    status: str | None = None
    full_transcript: str | None = None
    participants: list[ParticipantUpdatePayload] | None = None


class ActionItemPayload(BaseModel):
    description: str = Field(..., min_length=1)
    owner_id: int | None = None
    status: str = "open"
    due_date: date | None = None


class ActionItemUpdatePayload(BaseModel):
    description: str | None = Field(default=None, min_length=1)
    owner_id: int | None = None
    status: str | None = None
    due_date: date | None = None


ALLOWED_ACTION_STATUSES = {"open", "in_progress", "done", "blocked"}
ALLOWED_MEETING_STATUSES = {"scheduled",
                            "in_progress", "completed", "cancelled"}


def get_meeting_or_404(db: Session, meeting_id: int) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


def get_action_item_or_404(db: Session, action_item_id: int) -> ActionItem:
    action_item = db.query(ActionItem).filter(
        ActionItem.id == action_item_id).first()
    if not action_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    return action_item


def serialize_meeting_summary(meeting: Meeting) -> dict:
    summary = meeting.summaries[0].content if meeting.summaries else None
    return {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.meeting_date.isoformat(),
        "duration_minutes": meeting.duration_minutes,
        "status": meeting.status,
        "participant_count": len(meeting.participants),
        "participants": [participant.name for participant in meeting.participants],
        "summary": summary,
    }


def serialize_meeting_detail(meeting: Meeting) -> dict:
    return {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.meeting_date.isoformat(),
        "duration_minutes": meeting.duration_minutes,
        "status": meeting.status,
        "full_transcript": meeting.full_transcript,
        "participants": [
            {
                "id": participant.id,
                "name": participant.name,
                "email": participant.email,
                "role": participant.role,
            }
            for participant in meeting.participants
        ],
        "transcript": [
            {
                "id": segment.id,
                "speaker_name": (
                    segment.participant.name if segment.participant else segment.speaker_name
                ),
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "text": segment.text,
                "sequence": segment.sequence,
            }
            for segment in sorted(meeting.transcript_segments, key=lambda item: item.sequence)
        ],
        "summary": meeting.summaries[0].content if meeting.summaries else None,
        "topics": [
            {
                "id": topic.id,
                "title": topic.title,
                "start_time": topic.start_time,
                "end_time": topic.end_time,
                "summary": topic.summary,
                "order_index": topic.order_index,
            }
            for topic in sorted(meeting.topics, key=lambda item: item.order_index)
        ],
        "action_items": [
            {
                "id": item.id,
                "description": item.description,
                "status": item.status,
                "owner_id": item.owner_id,
                "due_date": item.due_date.isoformat() if item.due_date else None,
            }
            for item in meeting.action_items
        ],
    }


def replace_transcript_segments(
    db: Session, meeting: Meeting, transcript_text: str
) -> list[dict[str, str | int]]:
    parsed_segments = parse_transcript_segments(transcript_text)
    if not parsed_segments:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transcript must contain at least one non-empty line",
        )

    db.flush()
    participants = db.query(Participant).filter(
        Participant.meeting_id == meeting.id
    ).all()
    participant_by_name = {
        participant.name.casefold(): participant for participant in participants
    }

    db.execute(
        delete(TranscriptSegment).where(TranscriptSegment.meeting_id == meeting.id)
    )
    db.expire(meeting, ["transcript_segments"])

    for segment in parsed_segments:
        speaker_name = str(segment["speaker_name"])
        speaker_key = speaker_name.casefold()
        if speaker_name != "Unknown speaker" and speaker_key not in participant_by_name:
            participant = Participant(meeting_id=meeting.id, name=speaker_name)
            db.add(participant)
            db.flush()
            participant_by_name[speaker_key] = participant

        db.add(
            TranscriptSegment(
                meeting_id=meeting.id,
                participant_id=(
                    participant_by_name[speaker_key].id
                    if speaker_key in participant_by_name
                    else None
                ),
                speaker_name=speaker_name,
                start_time=str(segment["start_time"]),
                end_time=str(segment["end_time"]),
                text=str(segment["text"]),
                sequence=int(segment["sequence"]),
            )
        )

    return parsed_segments


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    db = SessionLocal()
    try:
        from .seed import seed_demo_data

        seed_demo_data(db)
    finally:
        db.close()


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "database": "sqlite"}


@app.get("/api/meetings")
def list_meetings(
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, description="Search by meeting title"),
    participant: str | None = Query(
        default=None, description="Search by participant name"),
    date_filter: str | None = Query(
        default=None, alias="date", description="Filter by meeting date in YYYY-MM-DD format"),
    sort: str = Query(default="recency", description="recency|oldest"),
) -> dict:
    query = db.query(Meeting)

    if q:
        query = query.filter(Meeting.title.ilike(f"%{q.strip()}%"))

    if participant:
        query = query.join(Participant).filter(
            Participant.name.ilike(f"%{participant.strip()}%"))

    if date_filter:
        try:
            meeting_date = date.fromisoformat(date_filter)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Invalid date format. Use YYYY-MM-DD.") from exc
        query = query.filter(Meeting.meeting_date == meeting_date)

    if sort == "oldest":
        query = query.order_by(Meeting.meeting_date.asc(), Meeting.id.asc())
    else:
        query = query.order_by(Meeting.meeting_date.desc(), Meeting.id.desc())

    meetings = query.all()
    return {"meetings": [serialize_meeting_summary(meeting) for meeting in meetings], "count": len(meetings)}


@app.get("/api/search")
def search_all_meetings(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_db),
) -> dict:
    search_term = q.strip()
    if not search_term:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a search term",
        )

    escaped_term = (
        search_term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )
    pattern = f"%{escaped_term}%"
    meetings = (
        db.query(Meeting)
        .options(
            selectinload(Meeting.participants),
            selectinload(Meeting.transcript_segments).selectinload(
                TranscriptSegment.participant
            ),
            selectinload(Meeting.summaries),
        )
        .filter(
            or_(
                Meeting.title.ilike(pattern, escape="\\"),
                Meeting.participants.any(Participant.name.ilike(pattern, escape="\\")),
                Meeting.transcript_segments.any(
                    TranscriptSegment.text.ilike(pattern, escape="\\")
                ),
                Meeting.summaries.any(Summary.content.ilike(pattern, escape="\\")),
            )
        )
        .order_by(Meeting.meeting_date.desc(), Meeting.id.desc())
        .limit(50)
        .all()
    )

    results = []
    normalized_term = search_term.casefold()

    def excerpt(value: str, *, context: int = 100, limit: int = 320) -> str:
        index = value.casefold().find(normalized_term)
        start = max(0, index - context)
        end = min(len(value), start + limit)
        prefix = "…" if start > 0 else ""
        suffix = "…" if end < len(value) else ""
        return f"{prefix}{value[start:end]}{suffix}"

    for meeting in meetings:
        matches: list[dict[str, str]] = []
        if normalized_term in meeting.title.casefold():
            matches.append({"field": "title", "text": meeting.title})

        for participant in meeting.participants:
            if normalized_term in participant.name.casefold():
                matches.append(
                    {"field": "participant", "text": participant.name}
                )

        transcript_match_count = 0
        for segment in sorted(meeting.transcript_segments, key=lambda item: item.sequence):
            if normalized_term in segment.text.casefold():
                matches.append(
                    {
                        "field": "transcript",
                        "text": excerpt(segment.text),
                        "speaker": (
                            segment.participant.name
                            if segment.participant
                            else segment.speaker_name
                        ),
                        "timestamp": segment.start_time,
                    }
                )
                transcript_match_count += 1
                if transcript_match_count == 5:
                    break

        for summary in meeting.summaries[:2]:
            if normalized_term in summary.content.casefold():
                matches.append(
                    {"field": "summary", "text": excerpt(summary.content)}
                )

        results.append(
            {"meeting": serialize_meeting_summary(meeting), "matches": matches}
        )

    return {"results": results, "count": len(results)}


@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> dict:
    meeting = get_meeting_or_404(db, meeting_id)
    return serialize_meeting_detail(meeting)


@app.post("/api/meetings", status_code=status.HTTP_201_CREATED)
def create_meeting(payload: MeetingCreatePayload, db: Session = Depends(get_db)) -> dict:
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Meeting title is required")

    existing_meeting = db.query(Meeting).filter(
        Meeting.title == title,
        Meeting.meeting_date == payload.meeting_date,
    ).first()
    if existing_meeting:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A meeting with this title and date already exists",
        )

    if payload.status and payload.status not in ALLOWED_MEETING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid meeting status")

    transcript_text = payload.full_transcript.strip()
    if not transcript_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transcript is required",
        )

    if not payload.participants:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add at least one participant",
        )

    validated_participants: list[ParticipantPayload] = []
    seen_names: set[str] = set()
    seen_emails: set[str] = set()
    for participant_payload in payload.participants:
        participant_name = participant_payload.name.strip()
        participant_email = participant_payload.email.strip(
        ) if participant_payload.email else None
        if not participant_name or "<" in participant_name or ">" in participant_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Participants must be names, optionally followed by an email in angle brackets",
            )
        if participant_email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", participant_email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid email address for participant {participant_name}",
            )
        if participant_name.casefold() in seen_names:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Participant {participant_name} is listed more than once",
            )
        if participant_email and participant_email.casefold() in seen_emails:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Email address {participant_email} is listed more than once",
            )
        seen_names.add(participant_name.casefold())
        if participant_email:
            seen_emails.add(participant_email.casefold())
        validated_participants.append(
            ParticipantPayload(
                name=participant_name,
                email=participant_email,
                role=participant_payload.role.strip() if participant_payload.role else None,
            )
        )

    meeting = Meeting(
        title=title,
        meeting_date=payload.meeting_date,
        duration_minutes=payload.duration_minutes,
        status=payload.status,
        full_transcript=transcript_text,
    )
    db.add(meeting)
    db.flush()

    for participant_payload in validated_participants:
        participant = Participant(
            meeting_id=meeting.id,
            name=participant_payload.name,
            email=participant_payload.email,
            role=participant_payload.role,
        )
        db.add(participant)
        db.flush()

    parsed_segments = replace_transcript_segments(db, meeting, transcript_text)

    if payload.summary and payload.summary.strip():
        summary_content = payload.summary.strip()
    else:
        preview = str(parsed_segments[0]["text"])[:120]
        summary_content = (
            "Mock summary (not AI-generated): "
            f"{len(parsed_segments)} transcript turn(s) were captured. "
            f"Review the transcript to confirm decisions. Opening note: {preview}"
        )
    db.add(Summary(meeting_id=meeting.id, content=summary_content))

    first_participant = meeting.participants[0]
    db.add(
        ActionItem(
            meeting_id=meeting.id,
            owner_id=first_participant.id,
            description="Review the transcript and confirm follow-up actions.",
            status="open",
        )
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A meeting with this title and date already exists",
        ) from exc
    db.refresh(meeting)
    return serialize_meeting_detail(meeting)


@app.put("/api/meetings/{meeting_id}")
def update_meeting(meeting_id: int, payload: MeetingUpdatePayload, db: Session = Depends(get_db)) -> dict:
    meeting = get_meeting_or_404(db, meeting_id)
    participant_updates: list[tuple[ParticipantUpdatePayload, str, str | None, str | None]] = []

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Meeting title is required")
        meeting.title = title

    if payload.meeting_date is not None:
        meeting.meeting_date = payload.meeting_date

    if payload.duration_minutes is not None:
        meeting.duration_minutes = payload.duration_minutes

    if payload.status is not None:
        if payload.status not in ALLOWED_MEETING_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid meeting status")
        meeting.status = payload.status

    if payload.full_transcript is not None:
        transcript_text = payload.full_transcript.strip()
        if not transcript_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Transcript is required",
            )
        meeting.full_transcript = transcript_text
        replace_transcript_segments(db, meeting, transcript_text)

    if payload.participants is not None:
        existing_participants = {participant.id: participant for participant in meeting.participants}
        seen_ids: set[int] = set()
        seen_names: set[str] = set()
        seen_emails: set[str] = set()

        for participant in payload.participants:
            name = participant.name.strip()
            email = participant.email.strip() if participant.email else None
            role = participant.role.strip() if participant.role else None
            if not name or "<" in name or ">" in name:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Participant names are required and cannot contain angle brackets",
                )
            if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid email address for participant {name}",
                )
            if name.casefold() in seen_names:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Participant {name} is listed more than once",
                )
            if email and email.casefold() in seen_emails:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Email address {email} is listed more than once",
                )
            if participant.id is not None:
                if participant.id not in existing_participants:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Participant not found for this meeting",
                    )
                if participant.id in seen_ids:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="A participant was included more than once",
                    )
                seen_ids.add(participant.id)

            seen_names.add(name.casefold())
            if email:
                seen_emails.add(email.casefold())
            participant_updates.append((participant, name, email, role))

        for participant_payload, name, email, role in participant_updates:
            participant = (
                existing_participants[participant_payload.id]
                if participant_payload.id is not None
                else Participant(meeting_id=meeting.id)
            )
            participant.name = name
            participant.email = email
            participant.role = role
            db.add(participant)

        removed_ids = set(existing_participants) - seen_ids
        if removed_ids:
            db.execute(
                update(TranscriptSegment)
                .where(TranscriptSegment.participant_id.in_(removed_ids))
                .values(participant_id=None)
            )
            db.execute(
                update(ActionItem)
                .where(ActionItem.owner_id.in_(removed_ids))
                .values(owner_id=None)
            )
            db.execute(
                delete(Participant).where(Participant.id.in_(removed_ids))
            )
        db.expire(meeting, ["participants"])

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A meeting with this title and date already exists",
        ) from exc
    db.refresh(meeting)
    return serialize_meeting_detail(meeting)


@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)) -> dict:
    meeting = get_meeting_or_404(db, meeting_id)
    db.delete(meeting)
    db.commit()
    return {"deleted": True, "id": meeting_id}


@app.get("/api/meetings/{meeting_id}/transcript")
def get_meeting_transcript(meeting_id: int, db: Session = Depends(get_db)) -> dict:
    meeting = get_meeting_or_404(db, meeting_id)
    transcript = [
        {
            "id": segment.id,
            "speaker_name": (
                segment.participant.name if segment.participant else segment.speaker_name
            ),
            "start_time": segment.start_time,
            "end_time": segment.end_time,
            "text": segment.text,
            "sequence": segment.sequence,
        }
        for segment in sorted(meeting.transcript_segments, key=lambda item: item.sequence)
    ]
    return {"meeting_id": meeting_id, "transcript": transcript}


@app.get("/api/meetings/{meeting_id}/summary")
def get_meeting_summary(meeting_id: int, db: Session = Depends(get_db)) -> dict:
    meeting = get_meeting_or_404(db, meeting_id)
    summary = meeting.summaries[0].content if meeting.summaries else ""
    return {"meeting_id": meeting_id, "summary": summary}


@app.get("/api/meetings/{meeting_id}/action-items")
def get_meeting_action_items(meeting_id: int, db: Session = Depends(get_db)) -> dict:
    meeting = get_meeting_or_404(db, meeting_id)
    return {
        "meeting_id": meeting_id,
        "action_items": [
            {
                "id": item.id,
                "description": item.description,
                "status": item.status,
                "owner_id": item.owner_id,
                "due_date": item.due_date.isoformat() if item.due_date else None,
            }
            for item in meeting.action_items
        ],
    }


@app.post("/api/meetings/{meeting_id}/action-items", status_code=status.HTTP_201_CREATED)
def create_action_item(meeting_id: int, payload: ActionItemPayload, db: Session = Depends(get_db)) -> dict:
    get_meeting_or_404(db, meeting_id)
    description = payload.description.strip()
    if not description:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Action item description is required",
        )
    if payload.status not in ALLOWED_ACTION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid action item status")
    if payload.owner_id is not None:
        owner = db.query(Participant).filter(
            Participant.id == payload.owner_id, Participant.meeting_id == meeting_id).first()
        if not owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Participant not found for this meeting")

    action_item = ActionItem(
        meeting_id=meeting_id,
        owner_id=payload.owner_id,
        description=description,
        status=payload.status,
        due_date=payload.due_date,
    )
    db.add(action_item)
    db.commit()
    db.refresh(action_item)
    return {
        "id": action_item.id,
        "meeting_id": action_item.meeting_id,
        "description": action_item.description,
        "status": action_item.status,
        "owner_id": action_item.owner_id,
        "due_date": action_item.due_date.isoformat() if action_item.due_date else None,
    }


@app.put("/api/action-items/{action_item_id}")
def update_action_item(action_item_id: int, payload: ActionItemUpdatePayload, db: Session = Depends(get_db)) -> dict:
    action_item = get_action_item_or_404(db, action_item_id)

    if payload.description is not None:
        description = payload.description.strip()
        if not description:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Action item description is required")
        action_item.description = description

    if payload.owner_id is not None:
        owner = db.query(Participant).filter(Participant.id == payload.owner_id,
                                             Participant.meeting_id == action_item.meeting_id).first()
        if not owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Participant not found for this meeting")
        action_item.owner_id = payload.owner_id

    if payload.status is not None:
        if payload.status not in ALLOWED_ACTION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action item status")
        action_item.status = payload.status

    if payload.due_date is not None:
        action_item.due_date = payload.due_date

    db.commit()
    db.refresh(action_item)
    return {
        "id": action_item.id,
        "meeting_id": action_item.meeting_id,
        "description": action_item.description,
        "status": action_item.status,
        "owner_id": action_item.owner_id,
        "due_date": action_item.due_date.isoformat() if action_item.due_date else None,
    }


@app.delete("/api/action-items/{action_item_id}")
def delete_action_item(action_item_id: int, db: Session = Depends(get_db)) -> dict:
    action_item = get_action_item_or_404(db, action_item_id)
    db.delete(action_item)
    db.commit()
    return {"deleted": True, "id": action_item_id}
