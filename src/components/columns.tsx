"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ClipItem } from "../App";
import { formatDateTime } from "../lib/utils";

export const columns: ColumnDef<ClipItem>[] = [
  {
    accessorKey: "clip",
    header: "Clip",
    cell: ({ row }) => {
      const clip = row.getValue("clip") as ClipItem["clip"];

      // Extract the plain text or show image info
      const displayText =
        clip.Text?.plain ||
        (clip.Image
          ? `Image (${clip.Image.width}x${clip.Image.height})`
          : "Unknown clip type");

      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {displayText}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
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
  {
    accessorKey: "category",
    header: "Category",

    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("category")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",

    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("notes")}
          </span>
        </div>
      );
    },
  },
];
