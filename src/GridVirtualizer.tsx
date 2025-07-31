import { useRef, useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
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
import { Trash, X } from "lucide-react";
import CategoryFilter from "./CategoryFilters";
import { ClipItem } from "./App";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";

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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 40;
        setContainerHeight(Math.max(500, availableHeight));
      }
    };

    const timer = setTimeout(calculateHeight, 100);
    window.addEventListener("resize", calculateHeight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateHeight);
    };
  }, [items]);

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
      <div className="mb-4 mx-2">
        <div className="relative flex flex-row items center gap-2">
          <Input
            type="text"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full  placeholder:text-xs"
          />
          {searchQuery && (
            <Button onClick={clearSearch} variant="ghost">
              <X className="h-2 w-2" />
            </Button>
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
                    <Button
                      onClick={clearSearch}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Clear search
                    </Button>
                  )}
                  {selectedCategories.length > 0 && (
                    <Button
                      onClick={clearAllCategories}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>No clips to display</p>
          )}
        </div>
      ) : (
        <ClipCard
          displayedItems={displayedItems}
          containerHeight={containerHeight}
          setSelectedItem={setSelectedItem}
          setDialogOpen={setDialogOpen}
          searchQuery={searchQuery}
        />
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

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Clip Details</DialogTitle>
        </DialogHeader>
        <div className="">
          {selectedItem && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="secondary">
                  {selectedItem.category || "Other"}
                </Badge>
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
              <div className="mb-4 max-h-96 overflow-auto border rounded p-3 bg-gray-50">
                {renderClipContent(
                  selectedItem.clip,
                  false,
                  searchQuery,
                  selectedItem.category
                )}
              </div>
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

              <div className="text-xs text-gray-500 flex items-end">
                Created: {formatDateTime(selectedItem.created_at)}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
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

const CodeBlock = ({
  code,
  language = "text",
  truncate = false,
}: {
  code: string;
  language?: string;
  truncate?: boolean;
}) => {
  const lines = code.split("\n");
  const displayCode =
    truncate && lines.length > 3
      ? lines.slice(0, 3).join("\n") + "\n..."
      : code;

  return (
    <div
      className={`relative rounded-md overflow-hidden border  ${
        truncate ? "max-h-24" : "max-h-96"
      }`}
    >
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{
          margin: 0,
          fontSize: "10px",
          padding: "8px",
          whiteSpace: "pre-wrap !important",
          width: "100%",
          maxWidth: "100%",
        }}
        wrapLongLines={true}
        PreTag="div"
        CodeTag="code"
        codeTagProps={{
          style: {
            whiteSpace: "pre-wrap !important",
            display: "block",
          },
        }}
      >
        {displayCode}
      </SyntaxHighlighter>
    </div>
  );
};

const renderClipContent = (
  clip: ClipItem["clip"],
  truncate: boolean = true,
  searchQuery?: string,
  category?: string
) => {
  if (clip.Text?.plain) {
    const text = clip.Text.plain;

    if (category === "code_snippet") {
      return <CodeBlock code={text} truncate={truncate} />;
    }

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
        <div className={truncate ? "line-clamp-3" : ""}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom components for better styling
              p: ({ children }) => (
                <p className="text-sm text-gray-900 mb-2 last:mb-0">
                  {children}
                </p>
              ),
              code: ({ children, className }) => {
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "";

                if (language) {
                  return (
                    <SyntaxHighlighter
                      language={language}
                      style={oneDark}
                      customStyle={{ fontSize: "0.75rem", margin: "0.5rem 0" }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                }

                return (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <div className="my-2">{children}</div>,
            }}
          >
            {searchQuery && !truncate
              ? text.replace(
                  new RegExp(
                    `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                    "gi"
                  ),
                  "**$1**"
                )
              : text}
          </ReactMarkdown>
        </div>
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

interface ClipCardProps {
  containerHeight: number;
  displayedItems: ClipItem[];
  setSelectedItem: (val: ClipItem) => void;
  setDialogOpen: (val: boolean) => void;
  searchQuery: string;
}

function ClipCard(props: ClipCardProps) {
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
