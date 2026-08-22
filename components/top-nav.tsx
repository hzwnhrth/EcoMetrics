"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/priorities", label: "Priorities" },
  { href: "/actions", label: "Actions" },
  { href: "/report", label: "Report" },
  { href: "/upload", label: "Upload" },
] as const;

export function TopNav({ tally }: { tally?: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-3">
        <span className="mr-4 text-sm font-semibold tracking-tight">
          ESG Evidence &amp; Action
        </span>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === link.href
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {tally ?? "no evidence loaded"}
          </Badge>
        </div>
      </div>
    </header>
  );
}
