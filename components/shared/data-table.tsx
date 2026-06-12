"use client"

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { useState } from "react"

interface DataTableProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  data: T[]
}

function ariaSortValue(
  sorted: false | "asc" | "desc"
): "none" | "ascending" | "descending" {
  if (sorted === "asc") return "ascending"
  if (sorted === "desc") return "descending"
  return "none"
}

export function DataTable<T>({ columns, data }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-zinc-50 border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const sortIndicator =
                  sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""
                const headerLabel = flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )

                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={canSort ? ariaSortValue(sorted) : undefined}
                    className="p-3 text-left text-sm font-medium"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className="-m-1 flex w-full items-center rounded px-1 py-0.5 text-left font-medium hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {headerLabel}
                        {sortIndicator ? (
                          <span aria-hidden="true">{sortIndicator}</span>
                        ) : null}
                      </button>
                    ) : (
                      headerLabel
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-zinc-400">
                ไม่มีข้อมูล
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-zinc-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
