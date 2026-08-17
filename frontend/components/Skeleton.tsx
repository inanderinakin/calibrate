"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-[var(--text-primary)]/10 ${className}`}
    />
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] border border-black/5 bg-[var(--card-bg)] p-6 shadow-[0_5px_20px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>

      <Skeleton className="h-[260px] w-full rounded-xl" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading your dashboard"
      className="page-texture min-h-screen overflow-x-hidden px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-9"
    >
      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}
        <header className="mb-5">
          <Skeleton className="h-12 w-[420px] max-w-full md:h-14 lg:h-16" />
          <Skeleton className="mt-2 h-6 w-[300px] max-w-full" />
        </header>

        {/* TOP SECTION */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">

          <Card className="p-7">
            <div className="flex h-full flex-col justify-center gap-5 md:flex-row md:items-center md:gap-8">
              <Skeleton className="mx-auto h-[220px] w-[220px] shrink-0 rounded-full" />

              <div className="flex flex-col justify-center gap-3">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-9 w-52 rounded-xl" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-7 w-44" />
              </div>

              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>

            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="grid grid-cols-[58px_1fr_65px] items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />

                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>

                  <Skeleton className="ml-auto h-7 w-14" />
                </div>
              ))}
            </div>

            <Skeleton className="mt-5 h-4 w-full max-w-[420px]" />
          </Card>
        </section>

        {/* LEARNING FOCUS */}
        <Card className="mt-5">
          <div className="mb-5 flex items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />

            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4, 5].map((card) => (
              <div key={card} className="rounded-[16px] border-2 border-black/10 p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />

                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>

                <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        {/* MARKET TRENDS */}
        <Card className="mt-5">
          <Skeleton className="mb-5 h-7 w-44" />
          <ChartSkeleton />
        </Card>

        {/* ROADMAP PREVIEW */}
        <Card className="mt-5">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-6 w-72 max-w-full" />
          </div>

          <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-4 md:divide-x md:divide-y-0">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell} className="flex items-center gap-4 px-4 py-2 md:px-6">
                <Skeleton className="h-14 w-14 shrink-0 rounded-full" />

                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* PROFILE SUMMARY */}
        <section className="mt-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-44" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-[118px] rounded-[18px]" />
              <Skeleton className="h-[118px] rounded-[18px]" />
            </div>
          </Card>
        </section>

        {/* GENERATE BUTTON */}
        <div className="flex justify-center py-6">
          <Skeleton className="h-16 w-[390px] max-w-full rounded-[18px]" />
        </div>
      </div>
    </main>
  );
}
