import type { MeetingTopic } from "@/lib/types";
import { downloadTextFile, safeFilename } from "@/lib/download";

type SummaryPanelProps = {
  meetingTitle: string;
  meetingDate: string;
  summary?: string | null;
  topics: MeetingTopic[];
};

export function SummaryPanel({
  meetingTitle,
  meetingDate,
  summary,
  topics,
}: SummaryPanelProps) {
  const exportSummary = () => {
    if (!summary) return;
    const content = `${meetingTitle}\n${meetingDate}\n\nSummary\n${summary}\n`;
    downloadTextFile(`${safeFilename(meetingTitle)}-summary.txt`, content);
  };

  return (
    <section
      className="summary-panel detail-panel"
      aria-labelledby="summary-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">MEETING NOTES</span>
          <h2 id="summary-heading">Summary</h2>
        </div>
        <div className="summary-panel-actions">
          <button
            className="secondary-button export-button"
            type="button"
            onClick={exportSummary}
            disabled={!summary}
          >
            Export summary
          </button>
          <span className="summary-sparkle" aria-hidden="true">
            ✦
          </span>
        </div>
      </div>
      <p className="summary-content">
        {summary || "No summary has been added for this meeting."}
      </p>
      <div className="summary-topic-preview">
        <span className="summary-topic-label">KEY TOPICS</span>
        {topics.length > 0 ? (
          <div className="topic-pills">
            {topics
              .slice()
              .sort((first, second) => first.order_index - second.order_index)
              .map((topic) => (
                <span key={topic.id}>{topic.title}</span>
              ))}
          </div>
        ) : (
          <p className="muted-copy">No key topics available.</p>
        )}
      </div>
    </section>
  );
}
