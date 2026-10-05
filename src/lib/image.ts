import type { SyntheticEvent } from "react";

export function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.hidden = true;
}
