import type { Metadata } from "next"
import { Toaster } from "sonner"
import { SessionProvider } from "next-auth/react"
import { MainNav } from "@/components/shared/main-nav"
import "./globals.css"

export const metadata: Metadata = {
  title: "Salary Detech — ระบบตรวจสอบคำสั่งข้าราชการ",
  description: "HR Order Freshness Check System",
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <SessionProvider>
          <MainNav />
          {children}
        </SessionProvider>
        <Toaster position="top-right" richColors duration={4000} />
      </body>
    </html>
  )
}
