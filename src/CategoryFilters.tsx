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

export default function CategoryFilter(props: CategoryFilterProps) {
  const {
    clearAllCategories,
    selectedCategories,
    toggleCategory,
    displayedItems,
    items,
  } = props;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedCategories.includes(cat)
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {cat}
          </Button>
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
  );
}
