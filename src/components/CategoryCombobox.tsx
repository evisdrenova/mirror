import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  categories: string[];
  className?: string;
}

export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Enter category...",
  categories,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredCategories, setFilteredCategories] = useState(categories);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter categories based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter((cat) =>
        cat.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, categories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectCategory = (category: string) => {
    setInputValue(category);
    onChange(category);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleCreateNew = () => {
    if (inputValue.trim() && !categories.includes(inputValue.trim())) {
      const newCategory = inputValue.trim().toLowerCase().replace(/\s+/g, "_");
      handleSelectCategory(newCategory);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, filteredCategories.length - (canCreate ? 0 : 1))
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        break;

      case "Enter":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          if (highlightedIndex < filteredCategories.length) {
            handleSelectCategory(filteredCategories[highlightedIndex]);
          } else if (canCreate) {
            handleCreateNew();
          }
        } else if (onKeyDown) {
          // Let parent handle Enter if no item is highlighted
          onKeyDown(e);
        }
        break;

      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow click on options
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Check if we can create a new category
  const canCreate =
    inputValue.trim() &&
    !categories.some((cat) => cat.toLowerCase() === inputValue.toLowerCase()) &&
    !filteredCategories.some(
      (cat) => cat.toLowerCase() === inputValue.toLowerCase()
    );

  const showDropdown = isOpen && (filteredCategories.length > 0 || canCreate);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredCategories.map((category, index) => (
            <div
              key={category}
              onClick={() => handleSelectCategory(category)}
              className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 ${
                index === highlightedIndex ? "bg-blue-50 text-blue-600" : ""
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {category}
            </div>
          ))}

          {canCreate && (
            <div
              onClick={handleCreateNew}
              className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 border-t border-gray-200 flex items-center gap-2 text-blue-600 ${
                highlightedIndex === filteredCategories.length
                  ? "bg-blue-50"
                  : ""
              }`}
              onMouseEnter={() =>
                setHighlightedIndex(filteredCategories.length)
              }
            >
              <Plus size={14} />
              Create "{inputValue.trim()}"
            </div>
          )}

          {filteredCategories.length === 0 && !canCreate && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No categories found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
