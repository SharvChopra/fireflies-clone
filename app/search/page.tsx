"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { searchMeetingsGlobally } from "@/lib/api";
import type { GlobalSearchResult } from "@/lib/types";

function highlightMatches(text: string, query: string): ReactNode {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(${escaped})`, "ig");
  return text.split(expression).map((part, index) =>
    part.toLocaleLowerCase() === query.toLocaleLowerCase() ? (
      <mark className="transcript-match" key={`${index}-${part}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [query]);

  const loadResults = useCallback(async () => {
    const currentRequest = ++requestVersion.current;
    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await searchMeetingsGlobally(debouncedQuery);
      if (currentRequest === requestVersion.current) {
        setResults(response.results);
      }
    } catch (searchError) {
      if (currentRequest === requestVersion.current) {
        setResults([]);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Unable to search meetings. Please retry.",
        );
      }
    } finally {
      if (currentRequest === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <div className="page-shell global-search-page">
          <header className="topbar">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h1>Search meetings</h1>
              <p className="library-subtitle">
                Search titles, participants, summaries, and transcript text.
              </p>
            </div>
            <Link href="/" className="secondary-button">
              ← Meetings library
            </Link>
          </header>

          <label className="global-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              autoFocus
              type="search"
              value={query}
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search all meetings..."
              aria-label="Search all meetings"
            />
          </label>

          {loading ? (
            <div className="loading-state global-search-state" aria-live="polite">
              Searching meetings...
            </div>
          ) : error ? (
            <div className="error-state global-search-state" role="alert">
              <h2>Search unavailable</h2>
              <p>{error}</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => void loadResults()}
              >
                Retry
              </button>
            </div>
          ) : !debouncedQuery ? (
            <div className="empty-state global-search-state">
              <h2>Search across your meetings</h2>
              <p>Enter a title, participant, decision, or phrase.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state global-search-state">
              <h2>No meetings match “{debouncedQuery}”</h2>
              <p>Try a different phrase or check the spelling.</p>
            </div>
          ) : (
            <section
              className="global-search-results"
              aria-label="Meeting search results"
            >
              <p className="global-search-count" aria-live="polite">
                {results.length} {results.length === 1 ? "meeting" : "meetings"}{" "}
                found
              </p>
              {results.map(({ meeting, matches }) => (
                <article className="global-search-result" key={meeting.id}>
                  <div className="global-search-result-heading">
                    <div>
                      <p className="eyebrow">
                        {meeting.date} · {meeting.duration_minutes} min
                      </p>
                      <h2>
                        <Link href={`/meetings/${meeting.id}`}>
                          {highlightMatches(meeting.title, debouncedQuery)}
                        </Link>
                      </h2>
                      <p className="global-search-participants">
                        {meeting.participants?.join(", ") ||
                          `${meeting.participant_count} participants`}
                      </p>
                    </div>
                    <Link
                      className="secondary-button"
                      href={`/meetings/${meeting.id}`}
                    >
                      Open meeting
                    </Link>
                  </div>
                  <ul className="global-search-matches">
                    {matches.map((match, index) => (
                      <li key={`${match.field}-${match.timestamp ?? ""}-${index}`}>
                        <span className="global-search-match-type">
                          {match.field}
                          {match.timestamp ? ` · ${match.timestamp}` : ""}
                          {match.speaker ? ` · ${match.speaker}` : ""}
                        </span>
                        <p>{highlightMatches(match.text, debouncedQuery)}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
