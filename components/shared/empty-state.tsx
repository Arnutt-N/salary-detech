import Link from "next/link"

interface EmptyStateAction {
  href: string
  label: string
  variant?: "primary" | "secondary"
}

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
      {icon ? (
        <p className="text-3xl" aria-hidden="true">
          {icon}
        </p>
      ) : null}
      <p className="mt-2 text-base font-medium text-zinc-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{description}</p>
      ) : null}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <Link
              href={action.href}
              className={
                action.variant === "secondary" ? "btn-secondary" : "btn-primary"
              }
            >
              {action.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className={
                secondaryAction.variant === "primary"
                  ? "btn-primary"
                  : "btn-secondary"
              }
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
