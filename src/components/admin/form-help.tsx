import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function FormHelp({
  children,
  tooltip,
  variant = "inline",
}: {
  children: ReactNode;
  tooltip?: string | undefined;
  variant?: "inline" | "callout";
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div
      className={
        variant === "callout"
          ? "flex items-start gap-2 border-l-2 border-primary/50 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          : "flex items-start gap-1.5 text-xs text-muted-foreground"
      }
      role={variant === "callout" ? "note" : undefined}
    >
      {variant === "callout" ? <span>{children}</span> : <p>{children}</p>}
      {tooltip ? (
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mais informações: ${tooltip}`}
              aria-expanded={tooltipOpen}
              onClick={(event) => setTooltipOpen(event.detail === 0 ? true : !tooltipOpen)}
            >
              <CircleHelp aria-hidden="true" className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
