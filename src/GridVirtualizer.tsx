import { useRef, useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./globals.css";
import { errorToast, successToast } from "./components/ui/toast";
import { isUrl } from "./lib/utils";
import { X } from "lucide-react";
import CategoryFilter from "./CategoryFilters";
import { ClipItem } from "./App";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import ClipCard from "./ClipCards";
import ClipDialog, { highlightSearchTerm } from "./ClipDialog";

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
        // Collect all searchable text
        const searchableFields = [
          item.clip.Text?.plain || "",
          item.summary || "",
          item.category || "",
          // Add tags to searchable fields
          ...(item.tags || []), // Spread the tags array, defaulting to empty array if undefined
        ];

        // Join all fields and normalize the text for better searching
        const searchableText = searchableFields
          .join(" ")
          .toLowerCase()
          // Normalize hyphens and special characters
          .replace(/[-_]/g, " ") // Replace hyphens and underscores with spaces
          .replace(/\s+/g, " ") // Replace multiple spaces with single space
          .trim();

        // Also normalize the search query the same way
        const normalizedQuery = query
          .replace(/[-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Check both original and normalized versions
        const originalText = searchableFields.join(" ").toLowerCase();

        return (
          originalText.includes(query) ||
          searchableText.includes(normalizedQuery) ||
          searchableText.includes(query)
        );
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
        <p>
          No clips yet. Copy something and press Cmd+Shift+S to get started!
        </p>
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
              <p className="text-xs">No clips match your search criteria</p>
              {(searchQuery || selectedCategories.length > 0) && (
                <div className="mt-2 space-x-2">
                  {searchQuery && (
                    <Button onClick={clearSearch}>Clear search</Button>
                  )}
                  {selectedCategories.length > 0 && (
                    <Button onClick={clearAllCategories}>Clear filters</Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>
              {" "}
              No clips yet. Copy something and press Cmd+Shift+S to get started!
            </p>
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

export const renderClipContent = (
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
          <span className="text-xs text-gray-500">{text}</span>
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

  return (
    <div className="border border-gray-200 p-2">
      <span className="text-sm text-gray-500">Unknown Clip</span>
    </div>
  );
};
