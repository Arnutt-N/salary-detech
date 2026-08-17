import type { Metadata } from "next"
import { Noto_Sans_Thai } from "next/font/google"
import { Toaster } from "sonner"
import { SessionProvider } from "next-auth/react"
import { MainNav } from "@/components/shared/main-nav"
import "./globals.css"

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Salary Detech — ระบบตรวจสอบคำสั่งข้าราชการ",
  description: "ระบบตรวจสอบความถูกต้องของข้อมูลในคำสั่งข้าราชการ",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSansThai.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 font-sans antialiased pb-[max(0px,env(safe-area-inset-bottom))]">
        <SessionProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          >
            ข้ามไปเนื้อหาหลัก
          </a>
          <MainNav />
          <main id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </SessionProvider>
        <Toaster position="top-right" richColors duration={4000} />
      </body>
    </html>
  )
}
