import { Skeleton } from "@/components/shared/skeleton"

export function DashboardPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6" aria-busy="true" aria-label="กำลังโหลดแผงควบคุม">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg" />
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>
      <section className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </section>
      <section className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </section>
    </div>
  )
}

export function ListPageSkeleton({ withFilters = true }: { withFilters?: boolean }) {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6" aria-busy="true" aria-label="กำลังโหลดรายการ">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-11 w-36 rounded-lg" />
      </div>
      {withFilters ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-lg" />
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
      ) : null}
      <Skeleton className="mb-4 h-4 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6" aria-busy="true" aria-label="กำลังโหลดฟอร์ม">
      <Skeleton className="mb-6 h-8 w-52" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6" aria-busy="true" aria-label="กำลังโหลดรายละเอียด">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
