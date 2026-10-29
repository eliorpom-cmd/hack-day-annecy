import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              An AI receptionist that answers every call, books appointments, and keeps
              your business running — built for teams too busy to pick up the phone.
            </p>
          </div>

          <div>
            <h3 className="eyebrow">Product</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/industries" className="text-muted-foreground hover:text-foreground transition-colors">
                  Industries
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">Sign in</a>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">© {year} AI Phone Desk</p>
        </div>
      </div>
    </footer>
  );
}
