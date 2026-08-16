import Link from "next/link"
import { STALE_REPORT_ACTION_LABEL } from "@/lib/order-types"

const STEPS = [
  {
    step: 1,
    title: "เพิ่มข้อมูลข้าราชการ",
    description: "บันทึกชื่อ ตำแหน่ง และสังกัดให้ตรงกับข้อมูลปัจจุบัน",
    href: "/employees/new",
    action: "เพิ่มข้าราชการ",
  },
  {
    step: 2,
    title: "นำเข้าหรือสร้างคำสั่ง",
    description: "ใช้ชุดคำสั่งสำหรับหลายรายการ หรือสร้างคำสั่งเดี่ยว",
    href: "/batches/new",
    action: "สร้างชุดคำสั่ง",
  },
  {
    step: 3,
    title: "ตรวจคำสั่งที่ต้องแก้ไข",
    description: "ระบบจะแจ้งเมื่อ snapshot ในคำสั่งไม่ตรงกับข้อมูล ณ วันที่มีผล",
    href: "/reports/stale",
    action: STALE_REPORT_ACTION_LABEL,
  },
] as const

export function GettingStartedPanel() {
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-6">
      <h2 className="text-lg font-bold text-zinc-900">เริ่มต้นใช้งาน</h2>
      <p className="mt-1 text-sm text-zinc-600">
        ทำตามลำดับนี้เพื่อให้ระบบตรวจความถูกต้องของคำสั่งได้ครบ
      </p>
      <ol className="mt-4 space-y-4">
        {STEPS.map((item) => (
          <li key={item.step} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {item.step}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{item.title}</p>
              <p className="mt-0.5 text-sm text-zinc-600">{item.description}</p>
              <Link href={item.href} className="btn-primary mt-3 inline-flex text-sm">
                {item.action}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
