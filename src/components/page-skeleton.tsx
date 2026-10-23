import { Skeleton } from "@/components/ui/primitives";

/**
 * Instant route fallback (used by every loading.tsx). It is prefetched with the
 * link, so a tap shows this frame immediately while the server streams data.
 */
export function PageSkeleton({
  stats = 4,
  chart = true,
  rows = 6,
  tabs = false,
}: {
  stats?: number;
  chart?: boolean;
  rows?: number;
  tabs?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading">
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>
      {tabs ? (
        <div className="flex gap-2 border-b border-hairline pb-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>
      ) : null}
      {stats ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
      ) : null}
      {chart ? (
        <div className="grid gap-8 md:grid-cols-12">
          <Skeleton className="h-56 md:col-span-7" />
          <Skeleton className="h-56 md:col-span-5" />
        </div>
      ) : null}
      <div className="flex flex-col divide-y divide-hairline">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
