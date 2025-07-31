import { ClipItem } from "./App";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime } from "./lib/utils";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";

import { Badge } from "./components/ui/badge";
import { renderClipContent } from "./GridVirtualizer";
import {
  Calendar,
  CalendarDaysIcon,
  Folder,
  Tag,
  TagIcon,
  Tags,
} from "lucide-react";

interface ClipCardProps {
  containerHeight: number;
  displayedItems: ClipItem[];
  setSelectedItem: (val: ClipItem) => void;
  setDialogOpen: (val: boolean) => void;
  searchQuery: string;
}

export default function ClipCard(props: ClipCardProps) {
  const {
    containerHeight,
    displayedItems,
    setSelectedItem,
    setDialogOpen,
    searchQuery,
  } = props;

  const itemsPerRow = 4;
  const rowCount = Math.ceil(displayedItems.length / itemsPerRow);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 2,
  });

  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={parentRef}
      className="w-full "
      style={{
        height: `${containerHeight}px`,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize() + 80}px`,
          width: "100%",
          position: "relative",
          paddingBottom: "80px",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const startIndex = rowIndex * itemsPerRow;
          const endIndex = Math.min(
            startIndex + itemsPerRow,
            displayedItems.length
          );
          const rowItems = displayedItems.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-4 gap-4 p-2 h-full">
                {rowItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                    onClick={() => {
                      setSelectedItem(item);
                      setDialogOpen(true);
                    }}
                  >
                    <div className="flex flex-row justify-between">
                      <div className="mb-2 flex flex-col gap-2">
                        <div className="flex flex-row items-center gap-1 text-xs">
                          <Folder className="w-3 h-3 text-gray-500" />
                          <Badge className="bg-gray-100 text-[10px] text-gray-800 border border-gray-300">
                            {item.category || "Other"}
                          </Badge>
                        </div>
                        <div className="flex flex-row items-center gap-1">
                          <Tags className="w-3 h-3 text-gray-500" />
                          {item.tags &&
                            item.tags.map((t) => (
                              <Badge
                                className="bg-blue-100 text-blue-800 text-[10px] rounded-full py-0"
                                key={t}
                              >
                                {t}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      <ArrowTopRightIcon className="h-3 w-3 text-blue-600 self-start" />
                    </div>
                    <div className="flex-1 mb-2">
                      {renderClipContent(
                        item.clip,
                        true,
                        searchQuery,
                        item.category
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-auto flex flex-row items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
