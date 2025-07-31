import { ClipItem } from "./App";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime } from "./lib/utils";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";

import { Badge } from "./components/ui/badge";
import { renderClipContent } from "./GridVirtualizer";

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
                      <div className="mb-2">
                        <Badge variant="secondary">
                          {item.category || "Other"}
                        </Badge>
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
                    <div className="text-xs text-gray-500 mt-auto">
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
