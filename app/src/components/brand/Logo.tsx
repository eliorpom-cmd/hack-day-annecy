import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M6.6 4.5h2.2l1.3 3.3-1.6 1.1a8.5 8.5 0 0 0 4.6 4.6l1.1-1.6 3.3 1.3v2.2a1.6 1.6 0 0 1-1.7 1.6C10.6 16.6 5.4 11.4 5 6.2a1.6 1.6 0 0 1 1.6-1.7Z"
          className="fill-primary-foreground"
        />
        <path d="M14.5 4.8a5 5 0 0 1 4.7 4.7" className="stroke-accent" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14.3 7.8a2 2 0 0 1 1.9 1.9" className="stroke-accent" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ to = "/", className, compact }: { to?: string; className?: string; compact?: boolean }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2.5 font-display font-semibold tracking-tight text-foreground", className)} aria-label="AI Phone Desk home">
      <LogoMark />
      {!compact && <span className="text-[17px]">AI Phone Desk</span>}
    </Link>
  );
}
