"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { UserNav } from "@/components/shared/user-nav"

const NAV_ITEMS = [
  { href: "/dashboard", label: "📊 แผงควบคุม" },
  { href: "/employees", label: "👥 ข้าราชการ" },
  { href: "/orders", label: "📋 คำสั่ง" },
  { href: "/batches", label: "📦 ชุดคำสั่ง" },
  { href: "/reports/stale", label: "🚨 ต้องแก้ไข" },
  { href: "/reports/audit", label: "📜 ประวัติการเปลี่ยนแปลง" },
]

function navLinkClass(active: boolean, block = false) {
  const base = block
    ? "flex min-h-11 w-full items-center rounded-lg px-3 text-sm"
    : "inline-flex min-h-11 items-center rounded-lg px-2 text-sm"
  return active
    ? `${base} bg-zinc-100 font-medium text-zinc-900`
    : `${base} text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900`
}

export function MainNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  if (pathname === "/login") return null

  return (
    <nav
      className="sticky top-0 z-10 border-b bg-white pt-[max(0px,env(safe-area-inset-top))]"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-14 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="shrink-0 text-sm font-bold text-zinc-900 sm:text-base"
          >
            Salary Detech
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={navLinkClass(active)}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex-1 lg:flex-none" />
          <UserNav />
          <button
            type="button"
            className="btn-touch border border-zinc-200 text-zinc-700 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="main-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "ปิดเมนู" : "เมนู"}
          </button>
        </div>

        {menuOpen ? (
          <div id="main-nav-menu" className="border-t py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={navLinkClass(active, true)}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
