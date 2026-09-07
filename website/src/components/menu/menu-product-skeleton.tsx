/** Skeleton cards matching ProductCard layout — used for Suspense / empty-load states. */
export function MenuProductSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
        >
          <div className="flex gap-3 p-3 sm:block sm:gap-0 sm:p-0">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-lg bg-zinc-900 sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 sm:p-4">
              <div className="h-4 w-3/4 max-w-[12rem] animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-1/2 max-w-[8rem] animate-pulse rounded bg-zinc-900" />
              <div className="mt-1 h-9 w-24 animate-pulse rounded-lg bg-zinc-800 sm:mt-3 sm:w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
