import re


_TIMESTAMP_PATTERN = r"\d{1,3}:\d{2}(?::\d{2})?"
_LINE_PATTERN = re.compile(
    rf"^\s*(?:\[(?P<bracketed_time>{_TIMESTAMP_PATTERN})\]\s*)?"
    rf"(?:(?P<bare_time>{_TIMESTAMP_PATTERN})\s+)?"
    r"(?P<speaker>[^:\r\n]{1,150}):\s*(?P<text>.+?)\s*$"
)


def _timestamp_seconds(value: str | None) -> int | None:
    if value is None:
        return None

    parts = [int(part) for part in value.split(":")]
    if len(parts) == 2:
        minutes, seconds = parts
        if seconds >= 60:
            return None
        return minutes * 60 + seconds

    hours, minutes, seconds = parts
    if minutes >= 60 or seconds >= 60:
        return None
    return hours * 3600 + minutes * 60 + seconds


def _format_timestamp(total_seconds: int) -> str:
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def parse_transcript_segments(transcript: str) -> list[dict[str, str | int]]:
    """Parse timestamped or speaker-prefixed transcript text into turns."""
    parsed_lines: list[tuple[str | None, str, str]] = []

    for raw_line in transcript.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = _LINE_PATTERN.match(line)
        if match:
            timestamp = match.group(
                "bracketed_time") or match.group("bare_time")
            parsed_lines.append(
                (timestamp, match.group("speaker").strip(),
                 match.group("text").strip())
            )
        elif parsed_lines:
            timestamp, speaker, text = parsed_lines[-1]
            parsed_lines[-1] = (timestamp, speaker, f"{text} {line}")
        else:
            parsed_lines.append((None, "Unknown speaker", line))

    next_auto_seconds = 0
    segments: list[dict[str, str | int]] = []
    starts: list[int] = []

    for timestamp, speaker, text in parsed_lines:
        explicit_seconds = _timestamp_seconds(timestamp)
        start_seconds = (
            explicit_seconds if explicit_seconds is not None else next_auto_seconds
        )
        starts.append(start_seconds)
        segments.append(
            {
                "speaker_name": speaker or "Unknown speaker",
                "start_time": _format_timestamp(start_seconds),
                "end_time": "",
                "text": text,
                "sequence": len(segments) + 1,
            }
        )
        next_auto_seconds = max(start_seconds + 15, next_auto_seconds + 15)

    for index, segment in enumerate(segments):
        start_seconds = starts[index]
        next_seconds = starts[index + 1] if index + \
            1 < len(starts) else start_seconds + 15
        end_seconds = next_seconds if next_seconds > start_seconds else start_seconds + 15
        segment["end_time"] = _format_timestamp(end_seconds)

    return segments
