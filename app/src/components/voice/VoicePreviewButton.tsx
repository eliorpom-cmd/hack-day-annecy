import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared preview player: only one preview plays at a time across the whole app,
// and any surface (voice card, dropdown, dialog) can start one programmatically.
const listeners = new Set<(playingId: string | null) => void>();
let currentAudio: HTMLAudioElement | null = null;
let currentId: string | null = null;

function notify() {
  for (const l of listeners) l(currentId);
}

function stopPreview() {
  currentAudio?.pause();
  currentAudio = null;
  currentId = null;
  notify();
}

export function playVoicePreview(id: string, previewUrl: string | null | undefined) {
  if (!previewUrl) return;
  if (currentId === id) {
    stopPreview();
    return;
  }
  currentAudio?.pause();
  const audio = new Audio(previewUrl);
  currentAudio = audio;
  currentId = id;
  audio.onended = stopPreview;
  audio.onerror = stopPreview;
  void audio.play().catch(stopPreview);
  notify();
}

export function VoicePreviewButton({
  previewUrl,
  voiceName,
  previewId,
  className,
}: {
  previewUrl: string | null | undefined;
  voiceName: string;
  previewId?: string;
  className?: string;
}) {
  const id = previewId ?? previewUrl ?? null;
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const listener = (playingId: string | null) =>
      setPlaying(playingId !== null && playingId === id);
    listeners.add(listener);
    listener(currentId);
    return () => {
      listeners.delete(listener);
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (currentId === id) stopPreview();
    };
  }, [id]);

  if (!previewUrl) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        playVoicePreview(id!, previewUrl);
      }}
      aria-label={playing ? `Stop ${voiceName} preview` : `Play ${voiceName} preview`}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent",
        playing && "border-accent bg-accent/10 text-accent",
        className,
      )}
    >
      {playing ? (
        <Square className="h-3 w-3 fill-current" />
      ) : (
        <Play className="ml-0.5 h-3 w-3 fill-current" />
      )}
    </button>
  );
}

export function AccentFlag({ accent }: { accent?: string | null }) {
  if (!accent) return null;
  const flag =
    accent === "american"
      ? "🇺🇸"
      : accent === "british"
        ? "🇬🇧"
        : accent === "australian"
          ? "🇦🇺"
          : null;
  if (!flag) return null;
  const label =
    accent === "american"
      ? "US accent"
      : accent === "british"
        ? "British accent"
        : "Australian accent";
  return (
    <span role="img" aria-label={label} title={label} className="text-sm leading-none">
      {flag}
    </span>
  );
}
