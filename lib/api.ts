import type {
    ActionItem,
    ActionItemStatus,
    MeetingDetail,
    MeetingSummary,
    MeetingsResponse,
    GlobalSearchResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
        });
    } catch {
        throw new Error('Could not reach the meeting service. Check your connection and retry.');
    }

    if (!response.ok) {
        let message = response.status >= 500
            ? 'The meeting service could not complete this request. Please try again.'
            : `Request failed (${response.status}).`;
        try {
            const payload = await response.json();
            const detail = payload?.detail;
            const detailMessage = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail.map((item: { msg?: string }) => item?.msg).filter(Boolean).join(' ')
                    : '';
            if (detailMessage && !/traceback|stack trace|\bat [\w.]+ \(.*:\d+:\d+\)/i.test(detailMessage)) {
                message = detailMessage;
            }
        } catch {
            // Keep the safe status-based message when the response isn't JSON.
        }
        throw new Error(message);
    }

    return (await response.json()) as T;
}

export async function fetchMeetings(params?: {
    q?: string;
    participant?: string;
    date?: string;
    sort?: 'recency' | 'oldest';
}): Promise<MeetingsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.q) searchParams.set('q', params.q);
    if (params?.participant) searchParams.set('participant', params.participant);
    if (params?.date) searchParams.set('date', params.date);
    if (params?.sort) searchParams.set('sort', params.sort);

    const queryString = searchParams.toString();
    return request<MeetingsResponse>(`/api/meetings${queryString ? `?${queryString}` : ''}`);
}

export async function fetchMeetingById(id: number): Promise<MeetingDetail> {
    return request<MeetingDetail>(`/api/meetings/${id}`);
}

export async function searchMeetingsGlobally(query: string): Promise<GlobalSearchResponse> {
    const searchParams = new URLSearchParams({ q: query });
    return request<GlobalSearchResponse>(`/api/search?${searchParams.toString()}`);
}

export async function updateMeeting(
    id: number,
    payload: {
        title?: string;
        meeting_date?: string;
        duration_minutes?: number;
        status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
        participants?: Array<{
            id?: number;
            name: string;
            email?: string | null;
            role?: string | null;
        }>;
    },
): Promise<MeetingDetail> {
    return request<MeetingDetail>(`/api/meetings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteMeeting(id: number): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(`/api/meetings/${id}`, {
        method: 'DELETE',
    });
}

export async function createActionItem(
    meetingId: number,
    payload: { description: string; owner_id?: number | null },
): Promise<ActionItem> {
    return request<ActionItem>(`/api/meetings/${meetingId}/action-items`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateActionItem(
    actionItemId: number,
    payload: { description?: string; status?: ActionItemStatus },
): Promise<ActionItem> {
    return request<ActionItem>(`/api/action-items/${actionItemId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteActionItem(actionItemId: number): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(`/api/action-items/${actionItemId}`, {
        method: 'DELETE',
    });
}

export async function createMeeting(payload: {
    title: string;
    meeting_date: string;
    duration_minutes: number;
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    full_transcript: string;
    participants: Array<{ name: string; email?: string; role?: string }>;
    summary?: string;
}): Promise<MeetingDetail> {
    return request<MeetingDetail>('/api/meetings', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
