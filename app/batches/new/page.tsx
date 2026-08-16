import { NewBatchForm } from "./NewBatchForm"

export default function NewBatchPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">📦 สร้างชุดคำสั่งใหม่</h1>
      <NewBatchForm />
    </div>
  )
}
