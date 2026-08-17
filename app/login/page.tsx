"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      username: form.get("username") as string,
      password: form.get("password") as string,
      redirect: false,
    })

    if (result?.error) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    } else {
      router.push(callbackUrl)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Salary Detech</h1>
          <p className="mt-1 text-sm text-zinc-500">ระบบตรวจสอบคำสั่งข้าราชการ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-700">
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="input-touch mt-1 block w-full shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
              placeholder="admin"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              รหัสผ่าน
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input-touch mt-1 block w-full shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
              placeholder="••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-touch w-full bg-zinc-900 font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "กำลังเข้าระบบ..." : "เข้าระบบ"}
          </button>
        </form>
      </div>
    </div>
  )
}
