import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VoiceOrb, type OrbState } from "./VoiceOrb";

export interface VoiceSessionToken {
  token: string;
  mock?: boolean;
  secondsAllowed?: number;
}

export interface VoiceSessionProps {
  /** Fetch a short-lived conversation token from the server. */
  getToken: () => Promise<VoiceSessionToken>;
  title?: string;
  subtitle?: string;
  startLabel?: string;
  suggestions?: string[];
  maxSeconds?: number;
  orbSize?: "md" | "lg" | "xl";
  showTranscript?: boolean;
  allowText?: boolean;
  onEnded?: (info: { seconds: number }) => void;
  onStarted?: () => void;
  className?: string;
  compact?: boolean;
}

interface Line {
  role: "user" | "agent";
  text: string;
}

/** Shared browser voice experience: landing demo, onboarding test, dashboard test. */
export function VoiceSession(props: VoiceSessionProps) {
  return (
    <ConversationProvider>
      <VoiceSessionInner {...props} />
    </ConversationProvider>
  );
}

function VoiceSessionInner({
  getToken,
  title,
  subtitle,
  startLabel = "Start conversation",
  suggestions = [],
  maxSeconds,
  orbSize = "lg",
  showTranscript = true,
  allowText = true,
  onEnded,
  onStarted,
  className,
  compact,
}: VoiceSessionProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [limit, setLimit] = useState<number | undefined>(maxSeconds);
  const [text, setText] = useState("");
  const [mockMode, setMockMode] = useState(false);
  const startedAt = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => {
      setConnecting(false);
      startedAt.current = Date.now();
      onStarted?.();
    },
    onDisconnect: () => {
      const secs = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
      startedAt.current = null;
      onEnded?.({ seconds: secs });
    },
    onMessage: (m) => {
      const role = (m as { role?: string; source?: string }).role ?? (m as { source?: string }).source;
      setLines((prev) => [...prev, { role: role === "user" ? "user" : "agent", text: m.message }]);
    },
    onError: (msg) => {
      setConnecting(false);
      setError(typeof msg === "string" ? "The call dropped. Please try again." : "Something went wrong with the call.");
    },
  });

  const connected = conversation.status === "connected";

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => {
      if (startedAt.current) {
        const secs = Math.round((Date.now() - startedAt.current) / 1000);
        setElapsed(secs);
        if (limit && secs >= limit) conversation.endSession();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [connected, limit, conversation]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const start = useCallback(async () => {
    setError(null);
    setLines([]);
    setElapsed(0);
    setConnecting(true);
    try {
      // Phones only allow sound after a tap: ask for the mic and unlock audio
      // playback right away, before any network wait.
      const micPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          await ctx.resume().catch(() => {});
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          setTimeout(() => ctx.close().catch(() => {}), 500);
        }
      } catch {
        /* ignore */
      }
      const [stream, res] = await Promise.all([micPromise, getToken()]);
      // Release the permission stream so the call can use the mic on mobile.
      stream.getTracks().forEach((t) => t.stop());
      if (res.secondsAllowed) setLimit(maxSeconds ? Math.min(maxSeconds, res.secondsAllowed) : res.secondsAllowed);
      if (res.mock || !res.token) {
        setMockMode(true);
        setConnecting(false);
        setLines([{ role: "agent", text: "Voice is running in preview mode here — connect ElevenLabs to talk live. Your receptionist is configured and ready." }]);
        return;
      }
      await conversation.startSession({ conversationToken: res.token, connectionType: "webrtc" });
    } catch (e) {
      setConnecting(false);
      const msg = e instanceof Error ? e.message : "";
      if (/denied|permission|NotAllowed/i.test(msg)) setError("We need microphone access to start the call.");
      else setError(msg && msg.length < 140 ? msg : "We couldn't start the call. Please try again.");
    }
  }, [getToken, conversation, maxSeconds]);

  const stop = useCallback(() => {
    if (mockMode) {
      setMockMode(false);
      setLines([]);
      return;
    }
    conversation.endSession();
  }, [conversation, mockMode]);

  const orbState: OrbState = error
    ? "error"
    : connecting || conversation.status === "connecting"
      ? "connecting"
      : connected
        ? conversation.isSpeaking
          ? "speaking"
          : "listening"
        : mockMode
          ? "listening"
          : "idle";

  const statusText =
    orbState === "connecting"
      ? "Connecting…"
      : orbState === "speaking"
        ? "Speaking"
        : orbState === "listening"
          ? "Listening…"
          : orbState === "error"
            ? "Call ended"
            : subtitle ?? "Tap to start a conversation";

  const active = connected || mockMode;

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {title && !compact && <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>}
      <div className={cn("relative", compact ? "my-3" : "my-6")}>
        <VoiceOrb state={orbState} size={compact ? "md" : orbSize} />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {statusText}
        {active && limit ? (
          <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground/80">
            {fmt(elapsed)} / {fmt(limit)}
          </span>
        ) : active ? (
          <span className="ml-2 font-mono text-xs tabular-nums">{fmt(elapsed)}</span>
        ) : null}
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-5 flex items-center gap-2">
        {!active ? (
          <Button size="lg" onClick={start} disabled={connecting} className="rounded-full px-6 shadow-glow">
            <Mic className="mr-2 h-4 w-4" />
            {connecting ? "Connecting…" : startLabel}
          </Button>
        ) : (
          <>
            {!mockMode && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => conversation.setMuted(!conversation.isMuted)}
                aria-label={conversation.isMuted ? "Unmute" : "Mute"}
              >
                {conversation.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="destructive" size="lg" onClick={stop} className="rounded-full px-6">
              <PhoneOff className="mr-2 h-4 w-4" /> End call
            </Button>
          </>
        )}
      </div>

      {!active && suggestions.length > 0 && (
        <div className="mt-6 text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Try asking about</p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showTranscript && lines.length > 0 && (
        <div ref={transcriptRef} className="mt-6 max-h-56 w-full space-y-2 overflow-y-auto rounded-xl border bg-surface p-3 text-left text-sm">
          {lines.map((l, i) => (
            <div key={i} className={cn("flex", l.role === "user" ? "justify-end" : "justify-start")}>
              <span
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-1.5",
                  l.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground border",
                )}
              >
                {l.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {allowText && connected && (
        <form
          className="mt-3 flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            conversation.sendUserMessage(text.trim());
            setLines((p) => [...p, { role: "user", text: text.trim() }]);
            setText("");
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type a message…" className="rounded-full" />
          <Button type="submit" size="icon" variant="secondary" className="rounded-full" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
