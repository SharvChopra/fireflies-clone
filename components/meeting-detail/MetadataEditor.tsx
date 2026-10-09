"use client";

import { useRef, useState, type FormEvent } from "react";
import type { MeetingDetail } from "@/lib/types";

type ParticipantDraft = {
  id?: number;
  name: string;
  email: string;
  role: string;
};

export type MeetingMetadataValues = {
  title: string;
  meeting_date: string;
  duration_minutes: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  participants: Array<{
    id?: number;
    name: string;
    email: string | null;
    role: string | null;
  }>;
};

type MetadataEditorProps = {
  meeting: MeetingDetail;
  onClose: () => void;
  onSave: (values: MeetingMetadataValues) => Promise<void>;
  onError: (message: string) => void;
};

export function MetadataEditor({
  meeting,
  onClose,
  onSave,
  onError,
}: MetadataEditorProps) {
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(meeting.date);
  const [duration, setDuration] = useState(meeting.duration_minutes);
  const [status, setStatus] = useState<MeetingMetadataValues["status"]>(
    meeting.status as MeetingMetadataValues["status"],
  );
  const [participants, setParticipants] = useState<ParticipantDraft[]>(
    meeting.participants.map(({ id, name, email, role }) => ({
      id,
      name,
      email: email ?? "",
      role: role ?? "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);

  const reportError = (message: string) => {
    setError(message);
    onError(message);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saveLock.current) return;
    if (!title.trim()) {
      reportError("Meeting title is required.");
      return;
    }
    if (!date || !Number.isFinite(duration) || duration < 1) {
      reportError("Enter a valid date and duration.");
      return;
    }
    if (participants.length === 0) {
      reportError("Add at least one participant.");
      return;
    }
    const participantNames = new Set<string>();
    for (const participant of participants) {
      const name = participant.name.trim();
      const email = participant.email.trim();
      if (!name) {
        reportError("Participant names are required.");
        return;
      }
      if (participantNames.has(name.toLocaleLowerCase())) {
        reportError(`${name} is listed more than once.`);
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        reportError(`Enter a valid email address for ${name}.`);
        return;
      }
      participantNames.add(name.toLocaleLowerCase());
    }

    saveLock.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        meeting_date: date,
        duration_minutes: duration,
        status,
        participants: participants.map((participant) => ({
          ...participant,
          name: participant.name.trim(),
          email: participant.email.trim() || null,
          role: participant.role.trim() || null,
        })),
      });
    } catch (saveError) {
      reportError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update meeting details. Please retry.",
      );
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metadata-dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">MEETING SETTINGS</span>
            <h2 id="metadata-dialog-title">Edit meeting details</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close edit dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="metadata-form" onSubmit={handleSubmit} noValidate>
          <label className="input-label">
            Meeting title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              required
            />
          </label>
          <div className="form-row">
            <label className="input-label">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label className="input-label">
              Duration (minutes)
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                required
              />
            </label>
          </div>
          <label className="input-label">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as MeetingMetadataValues["status"])
              }
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <fieldset className="participant-editor">
            <legend>Participants</legend>
            {participants.map((participant, index) => (
              <div className="participant-edit-row" key={participant.id ?? `new-${index}`}>
                <div className="participant-edit-fields">
                  <label className="input-label">
                    Name
                    <input
                      value={participant.name}
                      maxLength={150}
                      onChange={(event) =>
                        setParticipants((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                  </label>
                  <label className="input-label">
                    Email
                    <input
                      type="email"
                      value={participant.email}
                      maxLength={255}
                      onChange={(event) =>
                        setParticipants((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, email: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="input-label participant-role-field">
                    Role
                    <input
                      value={participant.role}
                      maxLength={120}
                      onChange={(event) =>
                        setParticipants((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, role: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <button
                  className="text-button participant-remove-button"
                  type="button"
                  onClick={() =>
                    setParticipants((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  aria-label={`Remove ${participant.name || "participant"}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="secondary-button participant-add-button"
              type="button"
              onClick={() =>
                setParticipants((current) => [
                  ...current,
                  { name: "", email: "", role: "" },
                ])
              }
            >
              + Add participant
            </button>
          </fieldset>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
