import { cn } from "@/lib/utils"

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-zinc-200/80 motion-safe:animate-pulse motion-reduce:animate-none motion-reduce:bg-zinc-200",
        className
      )}
      {...props}
    />
  )
}
