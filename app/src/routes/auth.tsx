import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, Sparkles, ShieldCheck, PhoneCall } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { callAuthed, useSession } from "@/lib/auth/client";
import { ensureOrganizationFn } from "@/lib/org/org.functions";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "magic"]).optional().catch("signin"),
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — AI Phone Desk" },
      { name: "description", content: "Sign in or create your AI Phone Desk account to set up your receptionist." },
      { property: "og:title", content: "Sign in — AI Phone Desk" },
      { property: "og:description", content: "Sign in or create your AI Phone Desk account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email or password isn't right. Try again.";
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already"))
    return "An account with that email already exists. Try signing in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password")) return message;
  return message || "Something went wrong. Please try again.";
}

const BENEFITS = [
  { icon: Sparkles, text: "Built from your website in minutes" },
  { icon: PhoneCall, text: "Answers calls, books jobs, and never sleeps" },
  { icon: ShieldCheck, text: "Sounds like your team, not a robot" },
];

function BrandPanel() {
  return (
    <div className="surface-gradient relative hidden flex-col justify-between overflow-hidden border-r border-border px-10 py-10 lg:flex lg:w-[44%]">
      <Logo />
      <div className="max-w-sm">
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground">
          Your AI receptionist. Ready in minutes.
        </h1>
        <ul className="mt-8 space-y-4">
          {BENEFITS.map((b) => (
            <li key={b.text} className="flex items-start gap-3 text-sm text-muted-foreground">
              <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} AI Phone Desk</p>
    </div>
  );
}

function GoogleButton({ onGoogleSession }: { onGoogleSession?: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={async () => {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/auth/callback`,
        });
        if ("error" in result && result.error) {
          toast.error("Google sign-in didn't complete. Please try again.");
          return;
        }
        if (!("redirected" in result && result.redirected)) onGoogleSession?.();
      }}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();

  async function routeAfterAuth() {
    try {
      const { organization } = await callAuthed(ensureOrganizationFn);
      if (!organization.onboarding_completed) {
        navigate({ to: "/onboarding" });
      } else if (redirect) {
        navigate({ href: redirect });
      } else {
        navigate({ to: "/app" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't set up your account.");
    }
  }

  const routedRef = useRef(false);
  useEffect(() => {
    if (!loading && session && !routedRef.current) {
      routedRef.current = true;
      routeAfterAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
          </div>

          <div className="card-elevated p-6 sm:p-8 animate-fade-up">
            {mode === "signup" ? (
              <SignUpForm redirect={redirect} onDone={routeAfterAuth} />
            ) : mode === "magic" ? (
              <MagicLinkForm />
            ) : (
              <SignInForm onDone={routeAfterAuth} />
            )}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <GoogleButton />

            <div className="mt-6 space-y-2 text-center text-sm">
              {mode !== "signin" && (
                <p className="text-muted-foreground">
                  Have an account?{" "}
                  <Link to="/auth" search={{ mode: "signin" }} className="font-medium text-foreground underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              )}
              {mode !== "signup" && (
                <p className="text-muted-foreground">
                  New here?{" "}
                  <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-foreground underline underline-offset-4">
                    Create an account
                  </Link>
                </p>
              )}
              {mode !== "magic" && (
                <p className="text-muted-foreground">
                  <Link to="/auth" search={{ mode: "magic" }} className="font-medium text-foreground underline underline-offset-4">
                    Sign in with a magic link instead
                  </Link>
                </p>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-4">
              Back to home
            </Link>
            <span className="mx-2">·</span>
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

function SignInForm({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setSubmitting(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    onDone();
  }

  return (
    <>
      <h2 className="font-display text-xl font-semibold text-foreground">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your receptionist.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@business.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </Form>
    </>
  );
}

const signUpSchema = z.object({
  full_name: z.string().min(1, "Enter your name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

function SignUpForm({ onDone }: { redirect?: string; onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.("track", "CompleteRegistration");
    if (data.session) {
      onDone();
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-display text-xl font-semibold text-foreground">Create your account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Set up your AI receptionist in a few minutes.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Jane Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@business.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>
      </Form>
    </>
  );
}

const magicSchema = z.object({ email: z.string().email("Enter a valid email address.") });

function MagicLinkForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof magicSchema>>({ resolver: zodResolver(magicSchema), defaultValues: { email: "" } });

  async function onSubmit(values: z.infer<typeof magicSchema>) {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Link sent</h2>
        <p className="mt-2 text-sm text-muted-foreground">Check your email and click the link to sign in.</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-display text-xl font-semibold text-foreground">Sign in with a magic link</h2>
      <p className="mt-1 text-sm text-muted-foreground">We'll email you a link — no password needed.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@business.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send magic link
          </Button>
        </form>
      </Form>
    </>
  );
}
