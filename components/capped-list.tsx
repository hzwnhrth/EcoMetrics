"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Layout at scale (QA item 9): vertical scroll with a capped preview — show
// the top N, then "Show all X". Never horizontal sprawl.
export function CappedList({
  items,
  cap = 5,
  noun,
  className,
}: {
  items: ReactNode[];
  cap?: number;
  noun: string; // "checks", "findings", "actions"
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, cap);

  return (
    <div className={className}>
      {visible}
      {items.length > cap && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? `Show top ${cap} only` : `Show all ${items.length} ${noun}`}
        </Button>
      )}
    </div>
  );
}
