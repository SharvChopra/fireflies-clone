import { formatPlayerTime, parseTimestamp } from "@/lib/time";
import type { MeetingTopic } from "@/lib/types";

type TopicListProps = {
  topics: MeetingTopic[];
  onSeek?: (seconds: number) => void;
};

export function TopicList({ topics, onSeek }: TopicListProps) {
  return (
    <section className="topic-list-section" aria-labelledby="topics-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CHAPTERS</span>
          <h2 id="topics-heading">Topics</h2>
        </div>
        <span className="segment-count">{topics.length}</span>
      </div>
      {topics.length === 0 ? (
        <p className="muted-copy">
          No topics or chapters were recorded for this meeting.
        </p>
      ) : (
        <ol className="topic-list">
          {topics
            .slice()
            .sort((first, second) => first.order_index - second.order_index)
            .map((topic) => {
              const content = (
                <>
                  <span className="topic-time">
                    {topic.start_time
                      ? formatPlayerTime(parseTimestamp(topic.start_time))
                      : "—"}
                    {topic.end_time
                      ? ` – ${formatPlayerTime(parseTimestamp(topic.end_time))}`
                      : ""}
                  </span>
                  <strong>{topic.title}</strong>
                  {topic.summary && <p>{topic.summary}</p>}
                </>
              );

              return (
                <li key={topic.id}>
                  {onSeek && topic.start_time ? (
                    <button
                      type="button"
                      className="topic-card topic-button"
                      onClick={() =>
                        onSeek(parseTimestamp(topic.start_time as string))
                      }
                      aria-label={`Seek to topic ${topic.title}`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="topic-card">{content}</div>
                  )}
                </li>
              );
            })}
        </ol>
      )}
    </section>
  );
}
