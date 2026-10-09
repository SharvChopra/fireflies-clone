"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatPlayerTime, parseTimestamp } from "@/lib/time";
import type { TranscriptSegment } from "@/lib/types";
import { downloadTextFile, safeFilename } from "@/lib/download";

type TranscriptPanelProps = {
  meetingTitle: string;
  meetingDate: string;
  segments: TranscriptSegment[];
  activeSegmentId: number | null;
  onSeek: (seconds: number) => void;
};

function highlightMatches(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(${escaped})`, "ig");
  return text.split(expression).map((part, index) =>
    part.toLocaleLowerCase() === query.trim().toLocaleLowerCase() ? (
      <mark className="transcript-match" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function TranscriptPanel({
  meetingTitle,
  meetingDate,
  segments,
  activeSegmentId,
  onSeek,
}: TranscriptPanelProps) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const lineRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const matchingSegmentIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return segments
      .filter((segment) => segment.text.toLowerCase().includes(normalizedQuery))
      .map((segment) => segment.id);
  }, [query, segments]);

  const hasSearch = Boolean(query.trim());
  const hasSearchResults = matchingSegmentIds.length > 0;

  useEffect(() => {
    setMatchIndex(0);
  }, [query]);

  const selectedMatchId = matchingSegmentIds[matchIndex] ?? null;
  useEffect(() => {
    if (selectedMatchId === null) return;
    lineRefs.current.get(selectedMatchId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedMatchId]);

  const navigateMatch = (direction: -1 | 1) => {
    if (matchingSegmentIds.length === 0) return;
    setMatchIndex(
      (current) =>
        (current + direction + matchingSegmentIds.length) %
        matchingSegmentIds.length,
    );
  };

  const exportTranscript = () => {
    const lines = segments.map(
      (segment) =>
        `[${segment.start_time}] ${segment.speaker_name}: ${segment.text}`,
    );
    const content = `${meetingTitle}\n${meetingDate}\n\nTranscript\n${lines.join("\n")}\n`;
    downloadTextFile(`${safeFilename(meetingTitle)}-transcript.txt`, content);
  };

  return (
    <section
      className="detail-panel transcript-panel-detail"
      aria-labelledby="transcript-heading"
    >
      <div className="section-heading transcript-heading-row">
        <div>
          <span className="eyebrow">CONVERSATION</span>
          <h2 id="transcript-heading">Transcript</h2>
        </div>
        <div className="transcript-heading-actions">
          <span className="segment-count">{segments.length} lines</span>
          <button
            className="secondary-button export-button"
            type="button"
            onClick={exportTranscript}
            disabled={segments.length === 0}
          >
            Export transcript
          </button>
        </div>
      </div>

      <div className="transcript-search-row">
        <label className="transcript-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transcript"
            aria-label="Search transcript"
          />
        </label>
        {hasSearch && (
          <button
            type="button"
            className="transcript-clear-search"
            onClick={() => setQuery("")}
            aria-label="Clear transcript search"
          >
            Clear
          </button>
        )}
        <div
          className="search-navigation"
          aria-label="Transcript search matches"
        >
          <span aria-live="polite">
            {matchingSegmentIds.length === 0
              ? hasSearch
                ? "0 matches"
                : ""
              : `${matchIndex + 1} of ${matchingSegmentIds.length}`}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => navigateMatch(-1)}
            disabled={matchingSegmentIds.length === 0}
            aria-label="Previous transcript match"
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => navigateMatch(1)}
            disabled={matchingSegmentIds.length === 0}
            aria-label="Next transcript match"
          >
            ↓
          </button>
        </div>
      </div>

      <div className="transcript-lines" aria-label="Transcript segments">
        {segments.length === 0 ? (
          <div className="empty-state compact-empty">
            <p>No transcript segments are available.</p>
          </div>
        ) : hasSearch && !hasSearchResults ? (
          <div className="empty-state compact-empty transcript-no-results">
            <strong>No transcript matches</strong>
            <p>Try a different word or clear your search to see every line.</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </div>
        ) : (
          segments.map((segment) => {
            const isActive = segment.id === activeSegmentId;
            const isSearchMatch = matchingSegmentIds.includes(segment.id);
            const isSelectedMatch = segment.id === selectedMatchId;
            const classes = [
              "transcript-line",
              isActive ? "is-active" : "",
              isSearchMatch ? "has-search-match" : "",
              isSelectedMatch ? "is-current-match" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                type="button"
                key={segment.id}
                ref={(element) => {
                  if (element) lineRefs.current.set(segment.id, element);
                  else lineRefs.current.delete(segment.id);
                }}
                className={classes}
                onClick={() => onSeek(parseTimestamp(segment.start_time))}
                aria-label={`Seek to ${segment.start_time}, ${segment.speaker_name}`}
                aria-current={isActive ? "time" : undefined}
              >
                <div className="transcript-line-meta">
                  <span className="transcript-timestamp">
                    {formatPlayerTime(parseTimestamp(segment.start_time))}
                  </span>
                  <strong>{segment.speaker_name}</strong>
                </div>
                <p>{highlightMatches(segment.text, query)}</p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
