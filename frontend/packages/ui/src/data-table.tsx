"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

export function DataTable<T>({ columns, data }: { columns: ColumnDef<T, unknown>[]; data: T[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-surface">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-line">
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-faint"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-bg">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3.5 align-middle text-ink">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
