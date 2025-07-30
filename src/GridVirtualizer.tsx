import { useRef, useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import "./globals.css";
import { errorToast, successToast } from "./components/ui/toast";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDateTime, isUrl } from "./lib/utils";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { Button } from "./components/ui/button";
import { Trash, Search, X } from "lucide-react";
import CategoryFilter from "./CategoryFilters";
import { ClipItem } from "./App";

interface GridVirtualizerProps {
  items: ClipItem[];
  getItems: () => Promise<void>;
}

export default function GridVirtualizer({
  items,
  getItems,
}: GridVirtualizerProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClipItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const parentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate available height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Use more aggressive height calculation
        const availableHeight = window.innerHeight - rect.top - 40; // Back to smaller margin
        setContainerHeight(Math.max(500, availableHeight));
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(calculateHeight, 100);
    window.addEventListener("resize", calculateHeight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateHeight);
    };
  }, [items]); // Re-calculate when items change

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

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Memoized filtering to prevent unnecessary re-renders
  const displayedItems = useMemo(() => {
    let filtered = items;

    // First apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        // Search in text content
        if (item.clip.Text?.plain) {
          return item.clip.Text.plain.toLowerCase().includes(query);
        }
        // Search in summary if available
        if (item.summary) {
          return item.summary.toLowerCase().includes(query);
        }
        // Search in category
        if (item.category) {
          return item.category.toLowerCase().includes(query);
        }
        return false;
      });
    }

    // Then apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(
        (item) => item.category && selectedCategories.includes(item.category)
      );
    }

    return filtered;
  }, [items, searchQuery, selectedCategories]);

  const itemsPerRow = 4;
  const rowCount = Math.ceil(displayedItems.length / itemsPerRow);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 2,
  });

  const handleDelete = async (itemId: string) => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await invoke("delete_item", { itemId });
      successToast("Successfully deleted the clip");

      setDialogOpen(false);
      setSelectedItem(null);

      await getItems();
    } catch (err) {
      errorToast("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No clips to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef}>
      {/* Search Bar */}
      <div className="mb-4 px-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-500">
            {displayedItems.length} result
            {displayedItems.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      <CategoryFilter
        toggleCategory={toggleCategory}
        selectedCategories={selectedCategories}
        clearAllCategories={clearAllCategories}
        displayedItems={displayedItems}
        items={items}
      />

      {displayedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery || selectedCategories.length > 0 ? (
            <div>
              <p>No clips match your search criteria</p>
              {(searchQuery || selectedCategories.length > 0) && (
                <div className="mt-2 space-x-2">
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Clear search
                    </button>
                  )}
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={clearAllCategories}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>No clips to display</p>
          )}
        </div>
      ) : (
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
              paddingBottom: "80px", // Add padding at the bottom
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
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.category || "Other"}
                            </span>
                          </div>
                          <ArrowTopRightIcon className="h-3 w-3 text-blue-600 self-start" />
                        </div>
                        <div className="flex-1 mb-2">
                          {renderClipContent(item.clip, true, searchQuery)}
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
      )}

      <ClipDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedItem={selectedItem}
        handleDelete={handleDelete}
        isDeleting={isDeleting}
        searchQuery={searchQuery}
      />
    </div>
  );
}

interface ClipDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (val: boolean) => void;
  selectedItem: ClipItem | null;
  handleDelete: (itemId: string) => Promise<void>;
  isDeleting: boolean;
  searchQuery?: string;
}

function ClipDialog(props: ClipDialogProps) {
  const {
    dialogOpen,
    setDialogOpen,
    selectedItem,
    handleDelete,
    isDeleting,
    searchQuery,
  } = props;

  console.log("selected item", selectedItem?.clip);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clip Details</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          {selectedItem && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedItem.category || "Other"}
                </span>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedItem.id);
                  }}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                  className="ml-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              </div>

              {/* Full clip content - no truncation */}
              <div className="mb-4 max-h-96 overflow-auto border rounded p-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Content:
                </h4>
                {renderClipContent(selectedItem.clip, false, searchQuery)}
              </div>

              {/* Summary if available */}
              {selectedItem.summary && (
                <div className="mb-4 max-h-96 overflow-auto border rounded p-3 bg-blue-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Summary:
                  </h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {highlightSearchTerm(selectedItem.summary, searchQuery)}
                  </p>
                </div>
              )}

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
  );
}

// Helper function to highlight search terms
const highlightSearchTerm = (text: string, searchQuery?: string) => {
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  const query = searchQuery.trim();
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const renderClipContent = (
  clip: ClipItem["clip"],
  truncate: boolean = true,
  searchQuery?: string
) => {
  if (clip.Text?.plain) {
    const text = clip.Text.plain;

    if (isUrl(text)) {
      return (
        <div className="flex flex-col space-y-1">
          <a
            href={text}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium text-blue-600 hover:text-blue-800 underline text-sm ${
              truncate ? "truncate" : "break-all"
            }`}
            title={text}
            onClick={(e) => e.stopPropagation()}
          >
            {searchQuery && !truncate
              ? highlightSearchTerm(text, searchQuery)
              : text}
          </a>
        </div>
      );
    } else {
      return (
        <p
          className={`text-sm text-gray-900 ${
            truncate ? "line-clamp-3" : "whitespace-pre-wrap"
          }`}
          title={truncate ? text : undefined}
        >
          {searchQuery && !truncate
            ? highlightSearchTerm(text, searchQuery)
            : text}
        </p>
      );
    }
  }

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

  return <span className="text-sm text-gray-500">Unknown clip type</span>;
};
