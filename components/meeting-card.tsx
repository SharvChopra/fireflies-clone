import Link from "next/link";
import type { MeetingSummary } from "@/lib/types";

export function MeetingCard({ meeting }: { meeting: MeetingSummary }) {
  return (
    <Link href={`/meetings/${meeting.id}`} className="meeting-card">
      <div className="card-header">
        <p className={`badge status-${meeting.status.replace(/_/g, "-")}`}>
          {meeting.status.replace(/_/g, " ")}
        </p>
        <time className="card-date" dateTime={meeting.date}>
          {meeting.date}
        </time>
      </div>

      <h3 className="card-title">{meeting.title}</h3>

      <div className="meta-row">
        <span className="card-meta-item">{meeting.duration_minutes} min</span>
        <span className="card-meta-item">
          {meeting.participant_count} participants
        </span>
      </div>
      <p className="card-participants">
        {meeting.participants?.join(", ") ||
          `${meeting.participant_count} participants`}
      </p>

      <p className="summary-copy">
        {meeting.summary || "No summary available yet."}
      </p>
    </Link>
  );
}
