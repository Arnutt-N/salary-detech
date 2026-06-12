"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserNav } from "@/components/shared/user-nav"

const NAV_ITEMS = [
  { href: "/dashboard", label: "📊 แผงควบคุม" },
  { href: "/employees", label: "👥 ข้าราชการ" },
  { href: "/orders", label: "📋 คำสั่ง" },
  { href: "/batches", label: "📦 ชุดคำสั่ง" },
  { href: "/reports/stale", label: "🚨 ต้องแก้ไข" },
  { href: "/reports/audit", label: "📜 Audit" },
]

export function MainNav() {
  const pathname = usePathname()

  if (pathname === "/login") return null

  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex items-center gap-5 px-6 h-12 text-sm">
        <Link href="/dashboard" className="font-bold text-zinc-900">
          Salary Detech
        </Link>
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "text-zinc-900 font-medium"
                  : "text-zinc-600 hover:text-zinc-900"
              }
            >
              {item.label}
            </Link>
          )
        })}
        <div className="flex-1" />
        <UserNav />
      </div>
    </nav>
  )
}
