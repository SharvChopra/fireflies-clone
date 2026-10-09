"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MeetingCard } from "@/components/meeting-card";
import { Sidebar } from "@/components/sidebar";
import { Toast, type ToastNotice } from "@/components/Toast";
import { fetchMeetings } from "@/lib/api";
import type { MeetingSummary } from "@/lib/types";

export default function MeetingsLibraryPage() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [participant, setParticipant] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState<"recency" | "oldest">("recency");
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedParticipant, setDebouncedParticipant] = useState(participant);
  const requestVersion = useRef(0);

  const loadMeetings = useCallback(async () => {
    const currentRequest = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMeetings({
        q: debouncedSearch,
        participant: debouncedParticipant,
        date,
        sort,
      });
      if (currentRequest === requestVersion.current) {
        setMeetings(result.meetings);
      }
    } catch (err) {
      if (currentRequest === requestVersion.current) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load meetings. Please retry.";
        setError(message);
        setToast({ kind: "error", message });
      }
    } finally {
      if (currentRequest === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [date, debouncedParticipant, debouncedSearch, sort]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setDebouncedParticipant(participant.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, participant]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (window.sessionStorage.getItem("meeting-deleted-toast") !== "1") return;
    setToast({ kind: "success", message: "Meeting deleted." });
    window.sessionStorage.removeItem("meeting-deleted-toast");
  }, []);

  const stats = useMemo(
    () => ({
      total: meetings.length,
      recent: meetings.filter((m) => m.status === "completed").length,
    }),
    [meetings],
  );
  const hasActiveFilters = Boolean(search.trim() || participant.trim() || date);

  const clearFilters = () => {
    setSearch("");
    setParticipant("");
    setDate("");
    setSort("recency");
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content">
        <div className="page-shell">
          <div className="topbar">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h1>Meetings Library</h1>
              <p className="library-subtitle">
                Your conversations, decisions, and follow-ups in one place.
              </p>
            </div>
            <div className="topbar-tools">
              <button className="secondary-button" type="button">
                Profile
              </button>
              <button className="secondary-button" type="button">
                Settings
              </button>
              <Link href="/meetings/new" className="primary-button">
                + New meeting
              </Link>
            </div>
          </div>

          <div className="toolbar">
            <div className="filter-group">
              <input
                className="search-box"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search meetings by title"
                aria-label="Search meetings by title"
              />

              <input
                className="filter-box"
                type="search"
                value={participant}
                onChange={(event) => setParticipant(event.target.value)}
                placeholder="Participant"
                aria-label="Search by participant"
              />

              <input
                className="filter-box"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                aria-label="Filter by date"
              />

              <select
                className="select-box"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "recency" | "oldest")
                }
                aria-label="Sort meetings"
              >
                <option value="recency">Most recent</option>
                <option value="oldest">Oldest</option>
              </select>
              {hasActiveFilters && (
                <button
                  className="clear-filters-button"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="filter-group" style={{ marginBottom: "20px" }}>
            <div className="meta-pill">Total: {stats.total}</div>
            <div className="meta-pill">Completed: {stats.recent}</div>
          </div>

          {loading ? (
            <div
              className="meetings-grid skeleton-grid"
              aria-label="Loading meetings"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  className="meeting-skeleton"
                  key={index}
                  aria-hidden="true"
                >
                  <div className="skeleton-line skeleton-status" />
                  <div className="skeleton-line skeleton-title" />
                  <div className="skeleton-line skeleton-meta" />
                  <div className="skeleton-line skeleton-summary" />
                  <div className="skeleton-line skeleton-summary short" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="error-state">
              <h3>Could not load meetings</h3>
              <p>{error}</p>
              <button
                className="primary-button"
                type="button"
                onClick={loadMeetings}
              >
                Retry
              </button>
            </div>
          ) : meetings.length === 0 ? (
            <div className="empty-state">
              <h3>
                {hasActiveFilters
                  ? "No meetings match your search"
                  : "No meetings yet"}
              </h3>
              <p>
                {hasActiveFilters
                  ? "Try another title, participant, or date, or clear the filters."
                  : "Create a meeting to start building your searchable library."}
              </p>
              <div className="empty-state-actions">
                {hasActiveFilters && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
                <Link href="/meetings/new" className="primary-button">
                  Create meeting
                </Link>
              </div>
            </div>
          ) : (
            <div className="meetings-grid">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && <Toast notice={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
