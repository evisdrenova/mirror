"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ClipItem } from "../App";
import { formatDateTime } from "../lib/utils";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { DataTableColumnHeader } from "./data-table-column-header";

const isUrl = (text: string) => /^https?:\/\/[^\s]+$/.test(text);

export const columns: ColumnDef<ClipItem>[] = [
  {
    accessorKey: "clip",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Clip" />
    ),
    cell: ({ row }) => {
      const clip = row.getValue("clip") as ClipItem["clip"];

      // Handle text clips
      if (clip.Text?.plain) {
        const text = clip.Text.plain;

        if (isUrl(text)) {
          return (
            <div className="flex space-x-2">
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[500px] truncate font-medium text-blue-600 hover:text-blue-800 underline"
              >
                {text}
              </a>
              <ArrowTopRightIcon />
            </div>
          );
        } else {
          return (
            <div className="flex space-x-2">
              <span className="max-w-[500px] truncate font-medium">{text}</span>
            </div>
          );
        }
      }

      // Handle image clips
      if (clip.Image) {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] truncate font-medium">
              Image ({clip.Image.width}x{clip.Image.height})
            </span>
          </div>
        );
      }

      // Fallback for unknown clip types
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            Unknown clip type
          </span>
        </div>
      );
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.trim() === "") {
        return true;
      }

      const clip = row.getValue("clip") as ClipItem["clip"];
      const searchTerm = filterValue.toLowerCase().trim();

      // Extract searchable text from clip
      let clipText = "";

      if (clip.Text?.plain) {
        clipText = clip.Text.plain.toLowerCase();
      } else if (clip.Image) {
        clipText =
          `image ${clip.Image.width}x${clip.Image.height}`.toLowerCase();
      }

      // Return true if search term is found in clip text
      return clipText.includes(searchTerm);
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created Date" />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
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
];
