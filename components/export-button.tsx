"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function ExportButton() {
  return (
    <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer data-icon="inline-start" />
      Export (print / PDF)
    </Button>
  );
}
