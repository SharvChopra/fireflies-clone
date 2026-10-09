"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createMeeting } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import { Toast, type ToastNotice } from "@/components/Toast";

type ParticipantInput = { name: string; email?: string };
type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

function parseParticipants(value: string): ParticipantInput[] {
  const entries = value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("Add at least one participant.");
  }

  const seenNames = new Set<string>();
  return entries.map((entry) => {
    const match = entry.match(/^([^<>]+?)(?:\s*<([^<>]+)>)?$/);
    if (!match) {
      throw new Error(`Check the participant format: “${entry}”.`);
    }

    const name = match[1].trim();
    const email = match[2]?.trim();
    if (!name || name.length > 150) {
      throw new Error("Enter a valid participant name (up to 150 characters).");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Enter a valid email address for ${name}.`);
    }
    if (seenNames.has(name.toLocaleLowerCase())) {
      throw new Error(`${name} is listed more than once.`);
    }
    seenNames.add(name.toLocaleLowerCase());
    return email ? { name, email } : { name };
  });
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(45);
  const [status, setStatus] = useState<MeetingStatus>("scheduled");
  const [participants, setParticipants] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptFilename, setTranscriptFilename] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [readingTranscript, setReadingTranscript] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const reportError = (message: string) => {
    setError(message);
    setToast({ kind: "error", message });
  };

  const handleTranscriptFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/\.(txt|md)$/i.test(file.name)) {
      reportError("Choose a plain-text .txt or .md transcript file.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reportError("Transcript files must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    setReadingTranscript(true);
    try {
      const contents = await file.text();
      if (!contents.trim()) {
        throw new Error("That transcript file is empty.");
      }
      setTranscript(contents);
      setTranscriptFilename(file.name);
      setError(null);
      setToast({ kind: "success", message: "Transcript file loaded." });
    } catch (fileError) {
      reportError(
        fileError instanceof Error
          ? fileError.message
          : "Unable to read this transcript file.",
      );
    } finally {
      setReadingTranscript(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (submitLock.current) return;

    const cleanTitle = title.trim();
    const cleanTranscript = transcript.trim();
    if (!cleanTitle) {
      reportError("Meeting title is required.");
      return;
    }
    if (!date) {
      reportError("Meeting date is required.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      reportError("Duration must be between 1 and 1,440 minutes.");
      return;
    }
    if (!cleanTranscript) {
      reportError("Paste or upload a transcript before creating the meeting.");
      return;
    }

    let participantList: ParticipantInput[];
    try {
      participantList = parseParticipants(participants);
    } catch (validationError) {
      reportError(
        validationError instanceof Error
          ? validationError.message
          : "Check the participant format.",
      );
      return;
    }

    submitLock.current = true;
    setLoading(true);

    try {
      const meeting = await createMeeting({
        title: cleanTitle,
        meeting_date: date,
        duration_minutes: Number(duration),
        status,
        full_transcript: cleanTranscript,
        participants: participantList,
      });

      window.sessionStorage.setItem("meeting-created-toast", "1");
      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      reportError(
        err instanceof Error
          ? err.message
          : "Unable to create meeting. Please retry.",
      );
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <div className="page-shell create-page">
          <header className="topbar create-heading">
            <div>
              <p className="eyebrow">MEETINGS</p>
              <h1>Create a meeting</h1>
              <p className="create-subtitle">
                Add the meeting details and paste a transcript to create its
                searchable record.
              </p>
            </div>
            <Link href="/" className="secondary-button">
              ← Back to library
            </Link>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="create-layout">
              <section className="create-panel">
                <div className="create-panel-heading">
                  <span className="step-number">01</span>
                  <div>
                    <h2>Meeting details</h2>
                    <p>Tell us when the meeting happened and who attended.</p>
                  </div>
                </div>

                <label className="input-label">
                  Meeting title <span className="required-mark">*</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Weekly product sync"
                    maxLength={255}
                    required
                  />
                </label>

                <div className="form-row">
                  <label className="input-label">
                    Meeting date <span className="required-mark">*</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="input-label">
                    Duration (minutes) <span className="required-mark">*</span>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={duration}
                      onChange={(event) =>
                        setDuration(Number(event.target.value))
                      }
                      required
                    />
                  </label>
                </div>

                <label className="input-label">
                  Participants <span className="required-mark">*</span>
                  <textarea
                    className="participants-input"
                    value={participants}
                    onChange={(event) => setParticipants(event.target.value)}
                    placeholder={"Ava Smith <ava@example.com>\nJordan Lee"}
                    required
                  />
                  <span className="field-hint">
                    Enter one name per line or separate names with commas. Email
                    is optional.
                  </span>
                </label>

                <label className="input-label">
                  Status
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as MeetingStatus)
                    }
                    className="select-box"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </section>

              <section className="create-panel transcript-panel">
                <div className="create-panel-heading">
                  <span className="step-number">02</span>
                  <div>
                    <h2>Meeting transcript</h2>
                    <p>
                      Paste transcript text; speaker names and timestamps are
                      parsed when possible.
                    </p>
                  </div>
                </div>

                <label className="input-label transcript-label">
                  Transcript <span className="required-mark">*</span>
                  <textarea
                    className="transcript-editor"
                    value={transcript}
                    onChange={(event) => {
                      setTranscript(event.target.value);
                      setTranscriptFilename("");
                    }}
                    placeholder={
                      "[00:00] John: Good morning everyone.\n[00:15] Sarah: Let's review the project status.\n[00:42] John: The backend is almost complete."
                    }
                    required
                  />
                  <span className="field-hint">
                    Add one speaker turn per line. Timestamp format: [MM:SS] or
                    [HH:MM:SS].
                  </span>
                </label>

                <label className="upload-control">
                  <span aria-hidden="true">↑</span>
                  <span>
                    <strong>
                      {readingTranscript
                        ? "Reading transcript…"
                        : transcriptFilename || "Upload a transcript"}
                    </strong>
                    <small>Plain-text .txt or .md file, up to 2 MB</small>
                  </span>
                  <input
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    onChange={handleTranscriptFile}
                    disabled={loading || readingTranscript}
                  />
                </label>
                <p className="mock-data-note">
                  A clearly labeled placeholder summary and follow-up action
                  will be added; no speech recognition is performed.
                </p>
              </section>
            </div>

            {error && (
              <div className="form-error" role="alert">
                <strong>Could not create meeting</strong>
                <span>{error}</span>
              </div>
            )}

            <footer className="create-footer">
              <span className="field-hint">
                Required fields are marked with *
              </span>
              <div className="topbar-tools">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading || readingTranscript}
                >
                  {loading ? "Saving meeting..." : "Create meeting →"}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </main>
      {toast && <Toast notice={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
