import { ClipItem } from "./App";
import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime } from "./lib/utils";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { Badge } from "./components/ui/badge";
import { renderClipContent } from "./GridVirtualizer";
import { Calendar, Folder, Tags } from "lucide-react";

interface ClipCardProps {
  containerHeight: number;
  displayedItems: ClipItem[];
  setSelectedItem: (val: ClipItem) => void;
  setDialogOpen: (val: boolean) => void;
  searchQuery: string;
}

// Function to calculate items per row based on screen width
const getItemsPerRow = (width: number): number => {
  if (width < 640) return 1; // sm
  if (width < 768) return 2; // md
  if (width < 1024) return 3; // lg
  return 4; // xl and above
};

// Function to get responsive grid classes
const getGridClasses = (width: number): string => {
  if (width < 640) return "grid-cols-1";
  if (width < 768) return "grid-cols-2";
  if (width < 1024) return "grid-cols-3";
  return "grid-cols-4";
};

export default function ClipCard(props: ClipCardProps) {
  const {
    containerHeight,
    displayedItems,
    setSelectedItem,
    setDialogOpen,
    searchQuery,
  } = props;

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const parentRef = useRef<HTMLDivElement>(null);

  // Update screen width on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const itemsPerRow = getItemsPerRow(screenWidth);
  const rowCount = Math.ceil(displayedItems.length / itemsPerRow);
  const gridClasses = getGridClasses(screenWidth);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 2,
  });
  return (
    <div
      ref={parentRef}
      className="w-full"
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
              <div
                className={`grid ${gridClasses} gap-2`}
                style={{
                  height: "200px",
                  padding: "5px",
                }}
              >
                {rowItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full min-h-[180px]"
                    onClick={() => {
                      setSelectedItem(item);
                      setDialogOpen(true);
                    }}
                  >
                    <div className="flex flex-row justify-between mb-2">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex flex-row items-center gap-1 text-xs">
                          <Folder className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          <Badge className="bg-gray-100 text-[10px] text-gray-800 border border-gray-300 truncate">
                            {item.category || "Other"}
                          </Badge>
                        </div>
                        <div className="flex flex-row items-center gap-1 flex-wrap">
                          <Tags className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {item.tags &&
                              item.tags.map((t) => (
                                <Badge
                                  className="bg-blue-100 text-blue-800 text-[10px] rounded-full py-0 truncate max-w-[80px]"
                                  key={t}
                                  title={t}
                                >
                                  {t}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>
                      <ArrowTopRightIcon className="h-3 w-3 text-blue-600 self-start flex-shrink-0 ml-2" />
                    </div>
                    <div className="flex-1 my-2 overflow-hidden border rounded p-3 bg-gray-50">
                      <div className="h-full max-h-[100px] overflow-hidden">
                        {renderClipContent(
                          item.clip,
                          true,
                          searchQuery,
                          item.category
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-[10px] text-gray-400 mt-auto flex flex-row items-center gap-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {formatDateTime(item.created_at)}
                      </span>
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
