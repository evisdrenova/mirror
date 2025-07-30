import { useRef, useState, useEffect } from "react";
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
import { Trash } from "lucide-react";
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

  const displayedItems =
    selectedCategories.length === 0
      ? items
      : items.filter(
          (item) => item.category && selectedCategories.includes(item.category)
        );

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
      <CategoryFilter
        toggleCategory={toggleCategory}
        selectedCategories={selectedCategories}
        clearAllCategories={clearAllCategories}
        displayedItems={displayedItems}
        items={items}
      />

      {displayedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No clips match the selected categories</p>
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
}

function ClipDialog(props: ClipDialogProps) {
  const { dialogOpen, setDialogOpen, selectedItem, handleDelete, isDeleting } =
    props;
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
                  {selectedItem.category || "Uncategorized"}
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
              <div className="mb-4 max-h-96 overflow-auto">
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
  );
}

const renderClipContent = (clip: ClipItem["clip"]) => {
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
            onClick={(e) => e.stopPropagation()}
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
