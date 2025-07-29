import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import { listen } from "@tauri-apps/api/event";
import "./globals.css";
import { errorToast } from "./components/ui/toast";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime } from "./lib/utils";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";

export const categories = [
  "code",
  "technical_advice",
  "documentation",
  "url",
  "communication",
  "notes",
  "reference",
  "creative",
  "business",
  "quotes",
  "academic",
  "errors",
  "other",
];

export interface ClipItem {
  id: string;
  clip: {
    Text?: { plain: string };
    Image?: { data: number[]; width: number; height: number };
  };
  created_at: string;
  category?: string;
}

const isUrl = (text: string) => /^https?:\/\/[^\s]+$/.test(text);

export default function App() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>();

  const getItems = async () => {
    setIsLoadingItems(true);
    try {
      const items = await invoke<ClipItem[]>("get_items");
      console.log("items", items);
      setItems(items);
    } catch (error) {
      console.log("error", error);
      errorToast("Unable to fetch items");
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    getItems();

    const unlisten = listen("clip-saved", () => {
      getItems();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div>
      <div className="mx-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mirror</h1>
        </div>
        <div className="mt-2">
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Loading clips...</div>
            </div>
          ) : (
            <ClipVirtualizer items={items} />
          )}
        </div>
        {items.length === 0 && !isLoadingItems && (
          <div className="text-center py-8 text-gray-500">
            <p>
              No clips yet. Copy something and press Cmd+Shift+S to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ClipVirtualizerProps {
  items: ClipItem[];
}

function ClipVirtualizer({ items }: ClipVirtualizerProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClipItem | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Filter items based on selected categories
  const displayedItems =
    selectedCategories.length === 0
      ? items
      : items.filter(
          (item) => item.category && selectedCategories.includes(item.category)
        );

  // Calculate items per row (4 columns)
  const itemsPerRow = 4;
  const rowCount = Math.ceil(displayedItems.length / itemsPerRow);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Height for each row of cards
    overscan: 2,
  });

  const renderClipContent = (clip: ClipItem["clip"]) => {
    // Handle text clips
    if (clip.Text?.plain) {
      const text = clip.Text.plain;

      if (isUrl(text)) {
        return (
          <div className="flex flex-col space-y-1">
            <a
              href={text}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium text-blue-600 hover:text-blue-800 underline text-sm"
              title={text}
              onClick={(e) => e.stopPropagation()} // Prevent dialog from opening
            >
              {text}
            </a>
          </div>
        );
      } else {
        return (
          <p className="text-sm text-gray-900 line-clamp-3" title={text}>
            {text}
          </p>
        );
      }
    }

    // Handle image clips
    if (clip.Image) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-2xl mb-1">🖼️</div>
          <span className="text-xs">
            {clip.Image.width}x{clip.Image.height}
          </span>
        </div>
      );
    }

    // Fallback for unknown clip types
    return <span className="text-sm text-gray-500">Unknown clip type</span>;
  };

  // If no items exist at all
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No clips to display</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Category Filter Bar */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedCategories.includes(cat)
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
          {selectedCategories.length > 0 && (
            <button
              onClick={clearAllCategories}
              className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200"
            >
              Clear All
            </button>
          )}
        </div>
        {selectedCategories.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {displayedItems.length} of {items.length} clips
          </div>
        )}
      </div>

      {/* Virtualized Grid */}
      {displayedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No clips match the selected categories</p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="w-full"
          style={{
            height: `600px`,
            overflow: "auto",
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const startIndex = rowIndex * itemsPerRow;
              const endIndex = Math.min(
                startIndex + itemsPerRow,
                displayedItems.length
              );
              const rowItems = displayedItems.slice(startIndex, endIndex); // Use displayedItems, not items

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
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.category || "Uncategorized"}
                            </span>
                          </div>
                          <ArrowTopRightIcon className="h-3 w-3 text-blue-600 self-start" />
                        </div>
                        <div className="flex-1 mb-2">
                          {renderClipContent(item.clip)}
                        </div>
                        <div className="text-xs text-gray-500 mt-auto">
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>
                    ))}

                    {/* Fill empty slots if last row is incomplete */}
                    {Array.from({ length: itemsPerRow - rowItems.length }).map(
                      (_, emptyIndex) => (
                        <div key={`empty-${rowIndex}-${emptyIndex}`} />
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog for clip details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clip Details</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {selectedItem && (
              <>
                <div className="mb-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedItem.category || "Uncategorized"}
                  </span>
                </div>
                <div className="mb-4">
                  {renderClipContent(selectedItem.clip)}
                </div>
                <div className="text-xs text-gray-500">
                  Created: {formatDateTime(selectedItem.created_at)}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
