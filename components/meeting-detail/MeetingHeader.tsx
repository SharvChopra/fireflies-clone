import Link from "next/link";
import type { MeetingDetail } from "@/lib/types";

type MeetingHeaderProps = {
  meeting: MeetingDetail;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
};

export function MeetingHeader({
  meeting,
  onEdit,
  onDelete,
  deleting,
}: MeetingHeaderProps) {
  return (
    <header className="meeting-detail-header">
      <div className="meeting-heading-main">
        <Link href="/" className="back-link">
          ← Meetings library
        </Link>
        <div className="meeting-title-row">
          <div>
            <span className="badge">{meeting.status.replace(/_/g, " ")}</span>
            <h1>{meeting.title}</h1>
          </div>
          <div className="meeting-header-actions">
            <button className="secondary-button" type="button" onClick={onEdit}>
              Edit details
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete meeting"}
            </button>
          </div>
        </div>
        <div className="meeting-meta-row">
          <span>📅 {meeting.date}</span>
          <span>◷ {meeting.duration_minutes} minutes</span>
          <span>👥 {meeting.participants.length} participants</span>
        </div>
        <div className="participant-avatars" aria-label="Meeting participants">
          {meeting.participants.map((participant) => (
            <span className="participant-chip" key={participant.id}>
              <span className="participant-dot" aria-hidden="true">
                {participant.name.slice(0, 1).toUpperCase()}
              </span>
              {participant.name}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
