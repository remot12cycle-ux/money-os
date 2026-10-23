import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Every screen reads the same owner data, so after any write we refresh the
 * whole app tree once. The server action's response then carries the fresh
 * page — the client must NOT call router.refresh() on top (that renders twice).
 */
export function revalidateApp() {
  revalidatePath("/", "layout");
}
