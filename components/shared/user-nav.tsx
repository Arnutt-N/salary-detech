"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

export function UserNav() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="h-11 w-16 animate-pulse rounded bg-gray-200" />
  }

  if (!session) {
    return (
      <Link href="/login" className="btn-touch text-xs text-zinc-600 hover:text-zinc-900">
        เข้าสู่ระบบ
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="hidden max-w-[8rem] truncate text-xs text-zinc-500 sm:inline">
        {session.user?.name}
      </span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="btn-touch text-xs text-zinc-600 transition-colors hover:text-red-600"
      >
        ออกจากระบบ
      </button>
    </div>
  )
}
