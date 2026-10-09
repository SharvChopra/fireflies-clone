"use client";

import { useEffect, type RefObject } from "react";
import { formatPlayerTime } from "@/lib/time";

const SAMPLE_RATE = 8000;
const MAX_SAMPLE_SECONDS = 2 * 60 * 60;

function createSilentWav(seconds: number): Blob {
  const duration = Math.min(
    MAX_SAMPLE_SECONDS,
    Math.max(60, Math.ceil(seconds)),
  );
  const dataLength = duration * SAMPLE_RATE;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeText(36, "data");
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).fill(128);

  return new Blob([buffer], { type: "audio/wav" });
}

type MediaPlayerProps = {
  audioRef: RefObject<HTMLAudioElement>;
  currentTime: number;
  durationSeconds: number;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onSeek: (seconds: number) => void;
};

export function MediaPlayer({
  audioRef,
  currentTime,
  durationSeconds,
  onTimeUpdate,
  onLoadedMetadata,
  onSeek,
}: MediaPlayerProps) {
  useEffect(() => {
    const sourceUrl = URL.createObjectURL(createSilentWav(durationSeconds));
    if (audioRef.current) {
      audioRef.current.src = sourceUrl;
      audioRef.current.load();
    }

    return () => {
      audioRef.current?.pause();
      URL.revokeObjectURL(sourceUrl);
    };
  }, [audioRef, durationSeconds]);

  return (
    <section className="media-player-panel" aria-label="Meeting media player">
      <div className="media-player-heading">
        <div>
          <span className="eyebrow">MEDIA PLAYER</span>
          <h2>Meeting recording</h2>
        </div>
        <span className="audio-source-badge">Silent timeline sample</span>
      </div>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        aria-label="Meeting audio timeline"
        onTimeUpdate={onTimeUpdate}
        onSeeking={onTimeUpdate}
        onSeeked={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
      />
      <div className="media-player-footer">
        <span>
          {formatPlayerTime(currentTime)} / {formatPlayerTime(durationSeconds)}
        </span>
        <span>Click any transcript line to seek to its timestamp.</span>
        <div className="media-skip-controls">
          <button
            className="icon-button"
            type="button"
            aria-label="Back 10 seconds"
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
          >
            −10s
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Forward 10 seconds"
            onClick={() => onSeek(Math.min(durationSeconds, currentTime + 10))}
          >
            +10s
          </button>
        </div>
      </div>
    </section>
  );
}
