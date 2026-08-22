"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/priorities", label: "Priorities" },
  { href: "/actions", label: "Actions" },
  { href: "/report", label: "Report" },
  { href: "/upload", label: "Upload" },
] as const;

export interface NavUser {
  name: string;
  title: string;
  role: string;
}

export function TopNav({ tally, user }: { tally?: string; user: NavUser | null }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="border-b print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
        <span className="mr-4 flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">EcoMetrics</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            ESG Evidence &amp; Action
          </span>
        </span>
        {user && (
          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  pathname === link.href
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {user && tally && (
            <Badge variant="outline" className="hidden font-normal text-muted-foreground sm:inline-flex">
              {tally}
            </Badge>
          )}
          {user && (
            <>
              <span
                className="text-xs text-muted-foreground"
                title={`Signed in as ${user.name}, ${user.title} — role: ${user.role}`}
              >
                <span className="font-medium text-foreground">{user.name}</span> · {user.title}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
                <LogOut className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
