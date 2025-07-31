import { ClipItem } from "./App";
import { Button } from "./components/ui/button";

interface CategoryFilterProps {
  clearAllCategories: () => void;
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
  displayedItems: ClipItem[];
  items: ClipItem[];
}

export const categories = [
  "code_snippet",
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

export default function CategoryFilter(props: CategoryFilterProps) {
  const {
    clearAllCategories,
    selectedCategories,
    toggleCategory,
    displayedItems,
    items,
  } = props;

  return (
    <div className="mb-4 mx-2">
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <Button
            key={cat}
            onClick={() => toggleCategory(cat)}
            variant="outline"
            className={`px-3 py-1 rounded-md text-xs ${
              selectedCategories.includes(cat)
                ? "bg-black text-white hover:bg-gray-700 hover:text-white"
                : "bg-transparent text-gray-800 hover:bg-gray-200"
            }`}
          >
            {cat}
          </Button>
        ))}
        {selectedCategories.length > 0 && (
          <Button
            onClick={clearAllCategories}
            className="px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
          >
            Clear All
          </Button>
        )}
      </div>
      {selectedCategories.length > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          Showing {displayedItems.length} of {items.length} clips
        </div>
      )}
    </div>
  );
}
