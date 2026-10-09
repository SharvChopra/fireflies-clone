export type Participant = {
    id: number;
    name: string;
    email?: string | null;
    role?: string | null;
};

export type MeetingSummary = {
    id: number;
    title: string;
    date: string;
    duration_minutes: number;
    status: string;
    participant_count: number;
    participants: string[];
    summary?: string | null;
};

export type TranscriptSegment = {
    id: number;
    speaker_name: string;
    start_time: string;
    end_time: string;
    text: string;
    sequence: number;
};

export type MeetingTopic = {
    id: number;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    summary?: string | null;
    order_index: number;
};

export type ActionItemStatus = "open" | "in_progress" | "done" | "blocked";

export type ActionItem = {
    id: number;
    meeting_id?: number;
    description: string;
    status: ActionItemStatus;
    owner_id?: number | null;
    due_date?: string | null;
};

export type MeetingDetail = {
    id: number;
    title: string;
    date: string;
    duration_minutes: number;
    status: string;
    full_transcript: string;
    participants: Participant[];
    transcript: TranscriptSegment[];
    summary?: string | null;
    topics: MeetingTopic[];
    action_items: ActionItem[];
};

export type MeetingsResponse = {
    meetings: MeetingSummary[];
    count: number;
};

export type GlobalSearchMatch = {
    field: "title" | "participant" | "transcript" | "summary";
    text: string;
    speaker?: string;
    timestamp?: string;
};

export type GlobalSearchResult = {
    meeting: MeetingSummary;
    matches: GlobalSearchMatch[];
};

export type GlobalSearchResponse = {
    results: GlobalSearchResult[];
    count: number;
};
