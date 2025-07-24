import React, { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  categories: string[];
  aiSuggestion?: string;
  className?: string;
}

export const CategoryInput: React.FC<CategoryInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Enter category...",
  categories,
  aiSuggestion,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isInitialized, setIsInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with AI suggestion when it arrives
  useEffect(() => {
    if (aiSuggestion && !isInitialized && !value) {
      setInputValue(aiSuggestion);
      onChange(aiSuggestion);
      setIsInitialized(true);
    }
  }, [aiSuggestion, isInitialized, value, onChange]);

  // Update input value when prop value changes (but not if user is actively typing)
  useEffect(() => {
    if (value !== inputValue && document.activeElement !== inputRef.current) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Tab completion for matching categories
    if (e.key === "Tab" && inputValue) {
      const matchingCategory = categories.find(
        (cat) =>
          cat.toLowerCase().startsWith(inputValue.toLowerCase()) &&
          cat.toLowerCase() !== inputValue.toLowerCase()
      );

      if (matchingCategory) {
        e.preventDefault();
        setInputValue(matchingCategory);
        onChange(matchingCategory);
        return;
      }
    }

    // Pass other key events to parent
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when focusing for easy replacement
    e.target.select();
  };

  // Find current autocomplete suggestion
  const autocompleteSuggestion = inputValue
    ? categories.find(
        (cat) =>
          cat.toLowerCase().startsWith(inputValue.toLowerCase()) &&
          cat.toLowerCase() !== inputValue.toLowerCase()
      )
    : null;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {autocompleteSuggestion && (
          <div
            className="absolute inset-0 px-3 py-2 text-sm text-gray-400 pointer-events-none bg-transparent border border-transparent rounded-md"
            style={{ zIndex: 1 }}
          >
            <span className="invisible">{inputValue}</span>
            <span>{autocompleteSuggestion.slice(inputValue.length)}</span>
          </div>
        )}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          style={{ zIndex: 2 }}
          className="md:text-xs"
        />
      </div>
    </div>
  );
};
