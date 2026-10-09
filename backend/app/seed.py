from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from .models import (
    ActionItem,
    Meeting,
    MeetingTopic,
    Participant,
    Summary,
    TranscriptSegment,
)


# Existing starter rows from the earlier three-meeting demo are recognized so
# --refresh-demo can replace those fixtures without touching user-created meetings.
LEGACY_DEMO_KEYS = {
    ("Product Roadmap Sync", date(2026, 10, 1)),
    ("Customer Onboarding Redesign", date(2026, 10, 3)),
    ("Q4 GTM Planning", date(2026, 10, 6)),
}


def _format_time(total_seconds: int) -> str:
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _make_segments(turns: list[tuple[str, str]]) -> list[dict[str, str | int]]:
    """Give each prepared transcript turn a plausible, increasing timestamp."""
    gap_seconds = (19, 24, 17, 28, 21, 16, 25, 20)
    starts: list[int] = []
    elapsed = 0
    for index in range(len(turns)):
        starts.append(elapsed)
        elapsed += gap_seconds[index % len(gap_seconds)]

    segments: list[dict[str, str | int]] = []
    for index, (speaker_name, text) in enumerate(turns):
        start = starts[index]
        end = starts[index + 1] if index + 1 < len(starts) else start + 22
        segments.append(
            {
                "speaker_name": speaker_name,
                "start_time": _format_time(start),
                "end_time": _format_time(end),
                "text": text,
                "sequence": index + 1,
            }
        )
    return segments


MEETINGS_DATA: list[dict] = [
    {
        "title": "Product Planning — Q4 Roadmap",
        "meeting_date": date(2026, 10, 9),
        "duration_minutes": 58,
        "status": "completed",
        "participants": [
            {"name": "Ava Chen", "email": "ava.chen@northstar.example",
                "role": "Product Lead"},
            {"name": "Marcus Reed", "email": "marcus.reed@northstar.example",
                "role": "Engineering Manager"},
            {"name": "Nina Patel", "email": "nina.patel@northstar.example",
                "role": "Product Designer"},
            {"name": "Omar Lewis", "email": "omar.lewis@northstar.example",
                "role": "Data Analyst"},
        ],
        "turns": [
            ("Ava Chen", "The purpose today is to turn the Q4 customer themes into a roadmap we can actually staff, not just a wish list."),
            ("Omar Lewis", "I grouped the last six weeks of feedback. Faster global search and reliable meeting exports were the two repeated requests."),
            ("Nina Patel", "On onboarding, people understand the transcript but miss the action list because it sits below the fold."),
            ("Marcus Reed", "Search is feasible this quarter if we keep the first release to title, participant, and transcript text."),
            ("Ava Chen", "That scope gives us a useful first milestone. We should separate the library filters from within-meeting transcript search."),
            ("Omar Lewis", "The support tickets also show that date filtering is hard to discover. The current default range hides older calls."),
            ("Nina Patel", "I can prototype a clearer date control and make the transcript search sit beside the conversation heading."),
            ("Marcus Reed", "For exports, the risk is preserving speaker names and timestamps across large transcripts."),
            ("Ava Chen", "Let's call exports a follow-on after search, unless the customer pilot says otherwise."),
            ("Omar Lewis", "I can tag the next batch of interview notes by team size and workflow so we can compare the requests."),
            ("Nina Patel", "I'll test the action-item placement with three people who take notes during calls."),
            ("Marcus Reed", "I need one week to benchmark the existing queries before I can give a safe indexing estimate."),
            ("Ava Chen", "We'll define the first release around title and participant search, a date filter, and a stable transcript viewer."),
            ("Omar Lewis", "Let's use time-to-find as the measure: users should find a past decision in under thirty seconds."),
            ("Nina Patel", "I will include a no-results state and a one-click way to clear filters in the prototype."),
            ("Marcus Reed", "I can put the query benchmark and storage impact in the technical note by Tuesday."),
            ("Ava Chen", "We also need to keep the roadmap flexible until the Northstar pilot confirms export is still secondary."),
            ("Omar Lewis", "I'll share the coded feedback summary with the group before the planning review."),
            ("Nina Patel", "I can have the first interaction draft ready for review on Thursday."),
            ("Ava Chen", "Great. Search is the committed milestone; exports and the action-list redesign are candidates pending evidence."),
        ],
        "summary": "The team made transcript and library search the committed Q4 milestone, covering title, participant, date, and within-meeting text. Export improvements and action-list placement remain candidates while the team gathers benchmark and pilot evidence.",
        "topics": [
            {"title": "Customer themes", "start_time": "00:00:00", "end_time": "00:01:42",
                "summary": "Prioritized global search, exports, date filtering, and clearer action lists from recent feedback."},
            {"title": "Q4 scope and measurement", "start_time": "00:01:43", "end_time": "00:04:05",
                "summary": "Committed to search and set time-to-find as the initial usability measure."},
            {"title": "Research and delivery", "start_time": "00:04:06", "end_time": "00:06:52",
                "summary": "Assigned query benchmarks, a feedback summary, and an interaction prototype."},
        ],
        "action_items": [
            {"description": "Benchmark title and participant search queries and report expected indexing work.",
                "owner_name": "Marcus Reed", "status": "in_progress"},
            {"description": "Prototype date filtering, transcript search placement, and clear-filter states.",
                "owner_name": "Nina Patel", "status": "open"},
            {"description": "Share the coded customer-feedback summary with the planning group.",
                "owner_name": "Omar Lewis", "status": "open"},
            {"description": "Confirm Q4 search success criteria with the Northstar pilot team.",
                "owner_name": "Ava Chen", "status": "open"},
        ],
    },
    {
        "title": "Engineering Standup — Search Reliability",
        "meeting_date": date(2026, 10, 8),
        "duration_minutes": 18,
        "status": "completed",
        "participants": [
            {"name": "Priya Nair", "email": "priya.nair@northstar.example",
                "role": "Backend Engineer"},
            {"name": "Theo Brooks", "email": "theo.brooks@northstar.example",
                "role": "Frontend Engineer"},
            {"name": "Ben Carter", "email": "ben.carter@northstar.example",
                "role": "QA Engineer"},
            {"name": "Maya Ortiz", "email": "maya.ortiz@northstar.example",
                "role": "Tech Lead"},
        ],
        "turns": [
            ("Maya Ortiz", "Quick round: yesterday's build passed, but the transcript query still needs a clear empty state."),
            ("Priya Nair", "The meeting list endpoint now applies title, participant, and date filters in one query."),
            ("Theo Brooks", "The debounce is in place on the two text fields; date and sort still apply immediately."),
            ("Ben Carter", "I found a flaky browser check where a previous search response arrives after a newer one."),
            ("Maya Ortiz", "The page should discard any response that doesn't match the latest request version."),
            ("Priya Nair", "That guard is in. I also checked the participant join doesn't duplicate meetings in our fixture data."),
            ("Theo Brooks", "The transcript search is client-side because each detail response already contains its segments."),
            ("Ben Carter", "Uppercase queries highlight correctly. I still want a test for punctuation in a search term."),
            ("Maya Ortiz", "Add an apostrophe and a bracket to the search test so we know regex escaping is covered."),
            ("Priya Nair", "The endpoint returns 422 for a malformed date and 404 when a meeting ID is valid but absent."),
            ("Theo Brooks", "I'm adding the request failure toast and leaving the inline error visible for retry context."),
            ("Ben Carter", "The loading skeleton shouldn't flash when I change sort; I'll verify it on a slower network."),
            ("Maya Ortiz", "Keep the current work small: finish search edge cases before starting the export ticket."),
            ("Priya Nair", "The API query is ready for the integration run after this call."),
            ("Theo Brooks", "I'll record a short video of filter clear, no results, and recovery after a failed request."),
            ("Ben Carter", "I'll add a repeatable check for title matching, participant matching, and oldest-first ordering."),
            ("Maya Ortiz", "Let's keep the search change in review until those browser checks pass."),
            ("Priya Nair", "I have no blocker after the browser suite; I'll post the benchmark with the pull request."),
            ("Theo Brooks", "No blocker from the UI. The error toast and inline message now share the safe API text."),
            ("Ben Carter", "I'll rerun the suite against the demo dataset and report anything that changes."),
        ],
        "summary": "The team reviewed the merged meeting filters, transcript search, stale-response protection, and error handling. Remaining checks cover special characters, slow-network loading, and repeatable browser coverage before the search work is approved.",
        "topics": [
            {"title": "Search implementation", "start_time": "00:00:00", "end_time": "00:02:35",
                "summary": "Reviewed server-side list filtering, client-side transcript search, and debouncing."},
            {"title": "Reliability and validation", "start_time": "00:02:36", "end_time": "00:05:28",
                "summary": "Checked stale response handling, API validation statuses, and error states."},
            {"title": "Test readiness", "start_time": "00:05:29", "end_time": "00:07:15",
                "summary": "Assigned browser tests for special characters, slow networks, and sort order."},
        ],
        "action_items": [
            {"description": "Add transcript search cases for apostrophes, brackets, and mixed case.",
                "owner_name": "Ben Carter", "status": "open"},
            {"description": "Verify skeleton and retry behavior under a throttled network profile.",
                "owner_name": "Ben Carter", "status": "open"},
            {"description": "Capture a browser walkthrough of filter clearing and no-result recovery.",
                "owner_name": "Theo Brooks", "status": "in_progress"},
            {"description": "Attach the query benchmark to the search pull request.",
                "owner_name": "Priya Nair", "status": "open"},
        ],
    },
    {
        "title": "Client Meeting — Northstar Health Launch",
        "meeting_date": date(2026, 10, 7),
        "duration_minutes": 46,
        "status": "completed",
        "participants": [
            {"name": "Elise Carter", "email": "elise.carter@northstar.example",
                "role": "Customer Success"},
            {"name": "Dr. Samir Shah", "email": "samir.shah@northstar-health.example",
                "role": "Clinical Operations"},
            {"name": "Rachel Kim", "email": "rachel.kim@northstar-health.example",
                "role": "Program Manager"},
            {"name": "Jordan Bell", "email": "jordan.bell@northstar.example",
                "role": "Solutions Engineer"},
            {"name": "Tanya Brooks", "email": "tanya.brooks@northstar-health.example",
                "role": "Training Lead"},
        ],
        "turns": [
            ("Elise Carter", "Thanks for making time. Today we should leave with a launch date and a clear owner for each clinic's setup."),
            ("Rachel Kim", "The pilot is ready at the downtown clinic. The east campus still needs its participant roster approved."),
            ("Dr. Samir Shah", "Clinical operations can approve the roster by Friday if the role list is final today."),
            ("Jordan Bell", "The integration is receiving the calendar events, but two test users still have duplicate display names."),
            ("Tanya Brooks", "Our supervisors asked for a short guide on finding a decision in the transcript after a handoff."),
            ("Elise Carter", "We can send a one-page search guide with the launch note, but let's keep training focused on the actual workflow."),
            ("Rachel Kim", "Can the east campus start on October fourteenth, assuming roster approval comes through?"),
            ("Dr. Samir Shah", "That date works. I need the final participant names and clinic roles before I sign off."),
            ("Jordan Bell", "I'll normalize the duplicate display names and rerun the calendar sync with the approved roster."),
            ("Tanya Brooks", "I can host two twenty-minute sessions, one for supervisors and another for the care coordinators."),
            ("Elise Carter", "Let's include the escalation contact in both sessions so questions don't sit in a shared inbox."),
            ("Rachel Kim", "The clinic managers prefer a single launch checklist with a status column, not another slide deck."),
            ("Dr. Samir Shah", "Agreed. The checklist should say how to verify a meeting and who can change the participant list."),
            ("Jordan Bell", "I'll add a sync health check and send the result with the cleaned roster."),
            ("Elise Carter", "For launch support, I'll monitor the first two days and collect issues in the customer channel."),
            ("Tanya Brooks", "I'll share the training calendar and record the sessions for staff on alternate shifts."),
            ("Rachel Kim", "I'll confirm the east-campus roster and the October fourteenth start date with the clinic managers."),
            ("Dr. Samir Shah", "I can approve the role list by end of day tomorrow once I see the corrected names."),
            ("Jordan Bell", "I have no blocker after the roster arrives. The calendar sync check should take less than an hour."),
            ("Elise Carter", "Great. We'll treat the fourteenth as the target and confirm it after the roster and sync checks are complete."),
        ],
        "summary": "Northstar Health is targeting an October 14 east-campus launch after participant roster approval and a calendar-sync check. The customer team agreed to run focused training, provide a practical launch checklist, and monitor the first two support days.",
        "topics": [
            {"title": "Pilot readiness", "start_time": "00:00:00", "end_time": "00:02:33",
                "summary": "Reviewed clinic readiness, participant roster approval, and duplicate names."},
            {"title": "Training and launch support", "start_time": "00:02:34", "end_time": "00:05:13",
                "summary": "Planned role-based training, a launch checklist, and a monitored support window."},
            {"title": "Launch decision", "start_time": "00:05:14", "end_time": "00:07:15",
                "summary": "Set October 14 as the target date pending roster and sync checks."},
        ],
        "action_items": [
            {"description": "Approve the east-campus participant roster and final clinic roles.",
                "owner_name": "Rachel Kim", "status": "in_progress"},
            {"description": "Resolve duplicate display names and rerun the calendar synchronization check.",
                "owner_name": "Jordan Bell", "status": "open"},
            {"description": "Schedule supervisor and care-coordinator training sessions.",
                "owner_name": "Tanya Brooks", "status": "open"},
            {"description": "Prepare the launch checklist and monitor support during the first two days.",
                "owner_name": "Elise Carter", "status": "open"},
            {"description": "Approve the clinic role list after reviewing the corrected participant names.",
                "owner_name": "Dr. Samir Shah", "status": "open"},
        ],
    },
    {
        "title": "Sprint Review — Collaboration Release",
        "meeting_date": date(2026, 10, 6),
        "duration_minutes": 42,
        "status": "completed",
        "participants": [
            {"name": "Maya Ortiz", "email": "maya.ortiz@northstar.example",
                "role": "Engineering Lead"},
            {"name": "Theo Brooks", "email": "theo.brooks@northstar.example",
                "role": "Frontend Engineer"},
            {"name": "Ben Carter", "email": "ben.carter@northstar.example",
                "role": "QA Engineer"},
            {"name": "Nina Patel", "email": "nina.patel@northstar.example",
                "role": "Product Designer"},
        ],
        "turns": [
            ("Maya Ortiz", "We'll review the collaboration release against the sprint goal: help a team hand off decisions without losing context."),
            ("Theo Brooks", "The transcript panel now follows the player and highlights the active speaker as playback moves."),
            ("Nina Patel", "The active line reads clearly, but I reduced the blue fill so it doesn't compete with search matches."),
            ("Ben Carter", "I verified that selecting a transcript turn seeks the player to that turn's start time."),
            ("Maya Ortiz", "Can we see the summary and follow-ups without scrolling past a very long transcript?"),
            ("Theo Brooks", "On wide screens they stay in the adjacent rail. On a phone the rail stacks below the transcript."),
            ("Ben Carter", "The action-item checkbox persists complete and reopen state after a refresh."),
            ("Nina Patel", "The topic cards also seek to chapter start, which makes the outline useful rather than decorative."),
            ("Maya Ortiz", "The assignment control is ready. We should show the assignee directly under each action description."),
            ("Theo Brooks", "That's in. Add and delete return only after the API responds, and then the list updates."),
            ("Ben Carter", "I tested an empty action description and a missing participant. Both return a useful validation message."),
            ("Nina Patel", "The small-screen dialog now scrolls internally so Save stays reachable on short displays."),
            ("Maya Ortiz", "The library skeleton is in, and the meeting page has its own matching loading placeholders."),
            ("Theo Brooks", "The silent sample player remains seekable; we don't imply that actual audio was uploaded."),
            ("Ben Carter", "One follow-up: cover a server failure and confirm its response doesn't expose a traceback."),
            ("Nina Patel", "I'll check the final mobile pass on the transcript and action panel spacing."),
            ("Maya Ortiz", "The key release criteria are met. Let's log the error-message check before marking the sprint complete."),
            ("Theo Brooks", "The detail page can retry after a failed load and the meeting mutations remain server-backed."),
            ("Ben Carter", "I'll add the 500-response test to our validation list and attach the results."),
            ("Maya Ortiz", "Thanks. We'll ship the collaboration release once the final failure-state check is recorded."),
        ],
        "summary": "The collaboration release demonstrated synchronized transcript seeking, active-speaker highlighting, chapter seeking, responsive summary/action panels, and persisted action controls. The remaining release check is to confirm server failures never expose internal traces.",
        "topics": [
            {"title": "Transcript and player", "start_time": "00:00:00", "end_time": "00:02:19",
                "summary": "Reviewed synchronized playback seeking, active transcript styling, and topic navigation."},
            {"title": "Action-item workflow", "start_time": "00:02:20", "end_time": "00:04:05",
                "summary": "Demonstrated assignments and persisted create, complete, reopen, and delete controls."},
            {"title": "Release quality", "start_time": "00:04:06", "end_time": "00:07:15",
                "summary": "Confirmed responsive loading states and tracked the final safe-error-message check."},
        ],
        "action_items": [
            {"description": "Add a regression check proving 500 responses do not expose server tracebacks.",
                "owner_name": "Ben Carter", "status": "open"},
            {"description": "Complete a final mobile spacing review of the transcript and action rail.",
                "owner_name": "Nina Patel", "status": "open"},
            {"description": "Record the release validation results and update the sprint checklist.",
                "owner_name": "Maya Ortiz", "status": "in_progress"},
            {"description": "Attach the detail-page API retry and mutation test results to the release note.",
                "owner_name": "Theo Brooks", "status": "open"},
        ],
    },
    {
        "title": "Marketing Discussion — Q4 Campaign",
        "meeting_date": date(2026, 10, 5),
        "duration_minutes": 51,
        "status": "completed",
        "participants": [
            {"name": "Harper Lee", "email": "harper.lee@northstar.example",
                "role": "Marketing Director"},
            {"name": "Victor Singh", "email": "victor.singh@northstar.example",
                "role": "Sales Director"},
            {"name": "Jade Alvarez", "email": "jade.alvarez@northstar.example",
                "role": "Revenue Operations"},
            {"name": "Omar Lewis", "email": "omar.lewis@northstar.example",
                "role": "Data Analyst"},
        ],
        "turns": [
            ("Harper Lee", "We need a campaign that helps the mid-market team explain the value quickly, not another broad awareness push."),
            ("Victor Singh", "The strongest sales conversations start with time saved on follow-ups and fewer missed decisions."),
            ("Jade Alvarez", "Our CRM shows the handoff from demo to trial is the point where prospects most often go quiet."),
            ("Omar Lewis", "The conversion rate is higher when the recap includes named owners and a dated next step."),
            ("Harper Lee", "Let's build the campaign around the meeting-to-action workflow and show a short product walkthrough."),
            ("Victor Singh", "We should use one customer example from operations and one from a distributed product team."),
            ("Jade Alvarez", "I can define a CRM field for the campaign source and keep the trial follow-up report consistent."),
            ("Omar Lewis", "We'll need a control group; otherwise we won't know whether the new recap story changed trial activation."),
            ("Harper Lee", "Agreed. We can launch to a matched segment first and review the numbers after two weeks."),
            ("Victor Singh", "Sales can nominate accounts, but we should exclude opportunities already in legal review."),
            ("Jade Alvarez", "I'll add that exclusion to the audience rules and share the final list with sales."),
            ("Omar Lewis", "For the dashboard, let's track qualified meeting bookings, trial activation, and follow-up completion."),
            ("Harper Lee", "The landing page needs a plain-language headline and a sample recap that doesn't use customer data."),
            ("Victor Singh", "I'll get approval for two customer quotes and confirm which teams can be named publicly."),
            ("Jade Alvarez", "The SDR group can follow up within one business day if the lead source is visible in the CRM."),
            ("Omar Lewis", "I can publish a weekly cohort report and compare it with the previous campaign baseline."),
            ("Harper Lee", "Let's use the approved quotes only after the customer signs off on the final wording."),
            ("Victor Singh", "I'll ask the account owners for approval by Thursday and flag any restrictions."),
            ("Jade Alvarez", "The audience and routing rules will be ready for a quick review tomorrow afternoon."),
            ("Harper Lee", "Great. We have a focused pilot, a measurable control, and clear owners for the launch dependencies."),
        ],
        "summary": "Marketing and sales agreed to pilot a mid-market campaign around converting meeting recaps into owned follow-ups. The team will use a matched control group, track qualified bookings and trial activation, and publish only customer-approved proof points.",
        "topics": [
            {"title": "Campaign positioning", "start_time": "00:00:00", "end_time": "00:02:29",
                "summary": "Positioned the campaign around turning meeting outcomes into accountable next steps."},
            {"title": "Audience and measurement", "start_time": "00:02:30", "end_time": "00:05:09",
                "summary": "Defined a matched pilot audience, exclusions, and conversion measures."},
            {"title": "Launch dependencies", "start_time": "00:05:10", "end_time": "00:07:15",
                "summary": "Assigned customer quote approvals, CRM routing, and weekly reporting."},
        ],
        "action_items": [
            {"description": "Confirm customer approval for the two campaign quotes and any public naming restrictions.",
                "owner_name": "Victor Singh", "status": "in_progress"},
            {"description": "Finalize audience exclusions and publish the pilot account list for review.",
                "owner_name": "Jade Alvarez", "status": "open"},
            {"description": "Set up the matched control and weekly activation cohort report.",
                "owner_name": "Omar Lewis", "status": "open"},
            {"description": "Draft the landing-page headline and privacy-safe sample recap for review.",
                "owner_name": "Harper Lee", "status": "open"},
        ],
    },
]


def _meeting_key(meeting: Meeting) -> tuple[str, date]:
    return meeting.title, meeting.meeting_date


def _create_meeting(db: Session, meeting_data: dict) -> Meeting:
    meeting = Meeting(
        title=meeting_data["title"],
        meeting_date=meeting_data["meeting_date"],
        duration_minutes=meeting_data["duration_minutes"],
        full_transcript="",
        status=meeting_data["status"],
    )
    db.add(meeting)
    db.flush()

    participant_by_name: dict[str, Participant] = {}
    for participant_data in meeting_data["participants"]:
        participant = Participant(
            meeting_id=meeting.id,
            name=participant_data["name"],
            email=participant_data["email"],
            role=participant_data["role"],
        )
        db.add(participant)
        db.flush()
        participant_by_name[participant.name] = participant

    segments = _make_segments(meeting_data["turns"])
    meeting.full_transcript = "\n".join(
        f"[{segment['start_time']}] {segment['speaker_name']}: {segment['text']}"
        for segment in segments
    )
    for segment in segments:
        participant = participant_by_name[str(segment["speaker_name"])]
        db.add(
            TranscriptSegment(
                meeting_id=meeting.id,
                participant_id=participant.id,
                speaker_name=str(segment["speaker_name"]),
                start_time=str(segment["start_time"]),
                end_time=str(segment["end_time"]),
                text=str(segment["text"]),
                sequence=int(segment["sequence"]),
            )
        )

    db.add(Summary(meeting_id=meeting.id, content=meeting_data["summary"]))

    for order_index, topic_data in enumerate(meeting_data["topics"], start=1):
        db.add(
            MeetingTopic(
                meeting_id=meeting.id,
                title=topic_data["title"],
                start_time=topic_data["start_time"],
                end_time=topic_data["end_time"],
                summary=topic_data["summary"],
                order_index=order_index,
            )
        )

    for item_data in meeting_data["action_items"]:
        owner = participant_by_name[item_data["owner_name"]]
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                owner_id=owner.id,
                description=item_data["description"],
                status=item_data["status"],
            )
        )

    return meeting


def seed_demo_data(db: Session, *, refresh_demo: bool = False) -> int:
    """Insert missing demo meetings; optionally refresh only recognized demo rows.

    Repeated calls are safe: the title/date key prevents duplicate meetings. With
    ``refresh_demo=True``, recognized current and legacy demo rows are replaced.
    Legacy starter fixtures are also migrated once when encountered. Meetings
    outside the recognized demo fixture set are left untouched.
    """
    seed_keys = {
        (item["title"], item["meeting_date"])
        for item in MEETINGS_DATA
    }

    has_legacy_fixtures = any(
        db.query(Meeting.id)
        .filter(Meeting.title == title, Meeting.meeting_date == meeting_date)
        .first()
        is not None
        for title, meeting_date in LEGACY_DEMO_KEYS
    )

    if refresh_demo or has_legacy_fixtures:
        demo_keys = seed_keys | LEGACY_DEMO_KEYS
        existing_demo_rows = db.query(Meeting).all()
        for meeting in existing_demo_rows:
            if _meeting_key(meeting) in demo_keys:
                db.delete(meeting)
        db.flush()

    existing_keys = {
        _meeting_key(meeting)
        for meeting in db.query(Meeting).all()
    }
    inserted = 0
    for meeting_data in MEETINGS_DATA:
        key = (meeting_data["title"], meeting_data["meeting_date"])
        if key in existing_keys:
            continue
        _create_meeting(db, meeting_data)
        existing_keys.add(key)
        inserted += 1

    db.commit()
    return inserted
