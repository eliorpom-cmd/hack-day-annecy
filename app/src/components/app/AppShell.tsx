import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  BarChart3,
  Calendar,
  Contact,
  MessagesSquare,
  Building2,
  Plug,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/Logo";
import { VoiceSession } from "@/components/voice/VoiceSession";
import { callAuthed } from "@/lib/auth/client";
import { getTestTokenFn } from "@/lib/receptionist/receptionist.functions";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { UsageBanner, UsageMeter } from "@/components/app/UsageMeter";

const NAV_MAIN = [
  { title: "Home", url: "/app", icon: Home },
  { title: "Receptionists", url: "/app/receptionists", icon: Users },
  { title: "Phone numbers", url: "/app/phone-numbers", icon: Phone },
  { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
];

const NAV_OPS = [
  { title: "Calendar", url: "/app/calendar", icon: Calendar },
  { title: "Clients", url: "/app/clients", icon: Contact },
  { title: "Staff", url: "/app/staff", icon: Users },
  { title: "Conversations", url: "/app/conversations", icon: MessagesSquare },
];

const NAV_SETUP = [
  { title: "Business", url: "/app/business", icon: Building2 },
  { title: "Integrations", url: "/app/integrations", icon: Plug },
  { title: "Settings", url: "/app/settings", icon: SettingsIcon },
];

function NavGroup({ label, items, pathname }: { label?: string; items: typeof NAV_MAIN; pathname: string }) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.url === "/app" ? pathname === "/app" : pathname.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/app": "Home",
  "/app/receptionists": "Receptionists",
  "/app/analytics": "Analytics",
  "/app/calendar": "Calendar",
  "/app/clients": "Clients",
  "/app/staff": "Staff",
  "/app/conversations": "Conversations",
  "/app/business": "Business",
  "/app/integrations": "Integrations",
  "/app/settings": "Settings",
  "/app/billing": "Billing",
  "/app/admin": "Admin",
};

function pageTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/app/receptionists/")) return "Receptionist";
  return "Dashboard";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [talkOpen, setTalkOpen] = useState(false);

  const firstReceptionist = workspace.receptionists[0];
  const canTalk = !!firstReceptionist?.elevenlabs_agent_id;
  const email = workspace.profile?.email ?? "";
  const initials = (workspace.profile?.name || email || "?").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-3">
          <Logo to="/app" />
        </SidebarHeader>
        <SidebarContent>
          <NavGroup items={NAV_MAIN} pathname={pathname} />
          <Separator className="mx-2 my-1 w-auto" />
          <NavGroup label="Operations" items={NAV_OPS} pathname={pathname} />
          <Separator className="mx-2 my-1 w-auto" />
          <NavGroup label="Setup" items={NAV_SETUP} pathname={pathname} />
          {workspace.isAdmin && (
            <>
              <Separator className="mx-2 my-1 w-auto" />
              <NavGroup items={[{ title: "Admin", url: "/app/admin", icon: ShieldCheck }]} pathname={pathname} />
            </>
          )}
        </SidebarContent>
        <SidebarFooter className="gap-3 px-2 pb-3">
          <div className="card-elevated flex flex-col gap-2 p-3">
            <p className="text-sm font-medium text-foreground">{workspace.plan?.name ?? "Free"} plan</p>
            {workspace.subscription ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {workspace.subscription.cancel_at_period_end ? "Cancels at period end" : "Subscription active"}
                </p>
                <UsageMeter compact />
                <Button size="sm" variant="secondary" asChild className="mt-1 w-full">
                  <Link to="/app/billing">Manage subscription</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {workspace.trialDaysLeft != null ? `Trial: ${workspace.trialDaysLeft} day${workspace.trialDaysLeft === 1 ? "" : "s"} left` : "Trial ended"}
                </p>
                <Button size="sm" variant="secondary" asChild className="mt-1 w-full">
                  <Link to="/app/billing">Upgrade</Link>
                </Button>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">{email}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="font-display text-sm font-semibold text-foreground">{pageTitle(pathname)}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" disabled={!canTalk} onClick={() => setTalkOpen(true)}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" /> Talk to your receptionist
                </Button>
              </span>
            </TooltipTrigger>
            {!canTalk && <TooltipContent>Create a receptionist first</TooltipContent>}
          </Tooltip>
        </header>
        <UsageBanner />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>

      <Dialog open={talkOpen} onOpenChange={setTalkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Talk to {firstReceptionist?.name ?? "your receptionist"}
            </DialogTitle>
          </DialogHeader>
          {firstReceptionist && (
            <VoiceSession
              getToken={() => callAuthed(getTestTokenFn, { data: { id: firstReceptionist.id } })}
              onStarted={() => localStorage.setItem("apd_tested_in_browser", "1")}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
