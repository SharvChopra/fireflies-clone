"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionItems } from "@/components/meeting-detail/ActionItems";
import { DeleteMeetingDialog } from "@/components/meeting-detail/DeleteMeetingDialog";
import { MediaPlayer } from "@/components/meeting-detail/MediaPlayer";
import { MeetingHeader } from "@/components/meeting-detail/MeetingHeader";
import {
  MetadataEditor,
  type MeetingMetadataValues,
} from "@/components/meeting-detail/MetadataEditor";
import { SummaryPanel } from "@/components/meeting-detail/SummaryPanel";
import { TopicList } from "@/components/meeting-detail/TopicList";
import { TranscriptPanel } from "@/components/meeting-detail/TranscriptPanel";
import { Sidebar } from "@/components/sidebar";
import { Toast, type ToastNotice } from "@/components/Toast";
import {
  createActionItem,
  deleteActionItem,
  deleteMeeting,
  fetchMeetingById,
  updateActionItem,
  updateMeeting,
} from "@/lib/api";
import { parseTimestamp } from "@/lib/time";
import type { ActionItem, MeetingDetail } from "@/lib/types";

export default function MeetingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const meetingId = Number(params.id);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const deleteLock = useRef(false);
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(false);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMeetingById(meetingId);
      setMeeting(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load meeting details. Please retry.";
      setError(message);
      setToast({ kind: "error", message });
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    if (window.sessionStorage.getItem("meeting-created-toast") !== "1") return;
    setToast({ kind: "success", message: "Meeting created successfully." });
    window.sessionStorage.removeItem("meeting-created-toast");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const durationSeconds = useMemo(() => {
    if (!meeting) return 60;
    return Math.max(
      meeting.duration_minutes * 60,
      60,
      ...meeting.transcript.map(
        (segment) => parseTimestamp(segment.end_time) + 5,
      ),
    );
  }, [meeting]);

  const activeSegmentId = useMemo(() => {
    if (!meeting) return null;
    const active = meeting.transcript.find((segment) => {
      const start = parseTimestamp(segment.start_time);
      const end = parseTimestamp(segment.end_time);
      return currentTime >= start && currentTime < end;
    });
    return active?.id ?? null;
  }, [currentTime, meeting]);

  const seekToTime = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!Number.isFinite(audio.duration) || audio.readyState === 0) {
      pendingSeekRef.current = seconds;
      return;
    }
    const target = Math.max(0, Math.min(seconds, audio.duration));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    const pendingSeek = pendingSeekRef.current;
    if (!audio || pendingSeek === null) return;
    audio.currentTime = Math.max(0, Math.min(pendingSeek, audio.duration));
    pendingSeekRef.current = null;
    setCurrentTime(audio.currentTime);
  };

  const handleCreateAction = async (description: string, ownerId?: number) => {
    const created = await createActionItem(meetingId, {
      description,
      owner_id: ownerId,
    });
    setMeeting((current) =>
      current
        ? { ...current, action_items: [...current.action_items, created] }
        : current,
    );
  };

  const handleUpdateAction = async (
    id: number,
    patch: { description?: string; status?: ActionItem["status"] },
  ) => {
    const updated = await updateActionItem(id, patch);
    setMeeting((current) =>
      current
        ? {
            ...current,
            action_items: current.action_items.map((item) =>
              item.id === id ? updated : item,
            ),
          }
        : current,
    );
  };

  const handleDeleteAction = async (id: number) => {
    await deleteActionItem(id);
    setMeeting((current) =>
      current
        ? {
            ...current,
            action_items: current.action_items.filter((item) => item.id !== id),
          }
        : current,
    );
  };

  const handleSaveMetadata = async (values: MeetingMetadataValues) => {
    const updated = await updateMeeting(meetingId, values);
    setMeeting(updated);
    setEditingMetadata(false);
    setToast({ kind: "success", message: "Meeting details updated." });
  };

  const handleDeleteMeeting = async () => {
    if (deleteLock.current) return;
    deleteLock.current = true;
    setDeletingMeeting(true);
    setOperationError(null);
    try {
      await deleteMeeting(meetingId);
      setConfirmDelete(false);
      window.sessionStorage.setItem("meeting-deleted-toast", "1");
      router.replace("/");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete meeting. Please retry.";
      setOperationError(message);
      setToast({ kind: "error", message });
    } finally {
      setDeletingMeeting(false);
      deleteLock.current = false;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content meeting-detail-content">
        <div className="page-shell meeting-detail-page">
          {loading ? (
            <div
              className="detail-loading-skeleton"
              aria-label="Loading meeting details"
            >
              <div className="skeleton-line detail-skeleton-title" />
              <div className="skeleton-line detail-skeleton-player" />
              <div className="detail-skeleton-columns">
                <div className="skeleton-line detail-skeleton-transcript" />
                <div className="skeleton-line detail-skeleton-summary" />
              </div>
            </div>
          ) : error || !meeting ? (
            <div className="error-state detail-state" role="alert">
              <h3>Could not load meeting</h3>
              <p>{error ?? "This meeting could not be found."}</p>
              <div className="topbar-tools">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void loadMeeting()}
                >
                  Retry
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => router.push("/")}
                >
                  Back to library
                </button>
              </div>
            </div>
          ) : (
            <>
              <MeetingHeader
                meeting={meeting}
                onEdit={() => setEditingMetadata(true)}
                onDelete={() => {
                  setOperationError(null);
                  setConfirmDelete(true);
                }}
                deleting={deletingMeeting}
              />

              {operationError && !confirmDelete && (
                <p className="inline-error global-detail-error" role="alert">
                  {operationError}
                </p>
              )}

              <MediaPlayer
                audioRef={audioRef}
                currentTime={currentTime}
                durationSeconds={durationSeconds}
                onSeek={seekToTime}
                onTimeUpdate={() => {
                  if (audioRef.current)
                    setCurrentTime(audioRef.current.currentTime);
                }}
                onLoadedMetadata={handleLoadedMetadata}
              />

              <div className="meeting-detail-grid">
                <TranscriptPanel
                  meetingTitle={meeting.title}
                  meetingDate={meeting.date}
                  segments={meeting.transcript}
                  activeSegmentId={activeSegmentId}
                  onSeek={seekToTime}
                />

                <aside className="meeting-detail-sidebar">
                  <SummaryPanel
                    meetingTitle={meeting.title}
                    meetingDate={meeting.date}
                    summary={meeting.summary}
                    topics={meeting.topics}
                  />
                  <ActionItems
                    items={meeting.action_items}
                    participants={meeting.participants}
                    onCreate={handleCreateAction}
                    onUpdate={handleUpdateAction}
                    onDelete={handleDeleteAction}
                    onSuccess={(message) =>
                      setToast({ kind: "success", message })
                    }
                    onError={(message) => setToast({ kind: "error", message })}
                  />
                  <TopicList topics={meeting.topics} onSeek={seekToTime} />
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {editingMetadata && meeting && (
        <MetadataEditor
          meeting={meeting}
          onClose={() => setEditingMetadata(false)}
          onSave={handleSaveMetadata}
          onError={(message) => setToast({ kind: "error", message })}
        />
      )}
      {confirmDelete && meeting && (
        <DeleteMeetingDialog
          title={meeting.title}
          deleting={deletingMeeting}
          error={operationError}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void handleDeleteMeeting()}
        />
      )}
      {toast && <Toast notice={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
