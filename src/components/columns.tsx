"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ClipItem } from "../App";
import { formatDateTime } from "../lib/utils";

export const columns: ColumnDef<ClipItem>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "clip",
    header: "Clip",
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {JSON.stringify(row.getValue("clip"))}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader column={column} title="Updated At" />
    //   ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {formatDateTime(row.getValue("created_at"))}
          </span>
        </div>
      );
    },
  },
];
