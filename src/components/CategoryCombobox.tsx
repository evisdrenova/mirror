import React, { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";
import { Sparkles } from "lucide-react";
import Spinner from "./Spinner";

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
  const [showInput, setShowInput] = useState(false);
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

  // Show input when there's no AI suggestion, or when user wants to edit
  useEffect(() => {
    if (!aiSuggestion && !inputValue) {
      setShowInput(false);
    } else if (inputValue !== aiSuggestion) {
      setShowInput(true);
    } else {
      setShowInput(false);
    }
  }, [aiSuggestion, inputValue]);

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

    // Handle Escape to go back to badge view
    if (e.key === "Escape" && aiSuggestion && inputValue === aiSuggestion) {
      setShowInput(false);
      inputRef.current?.blur();
      return;
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

  const handleBadgeClick = () => {
    setShowInput(true);
    // Focus input on next tick
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputBlur = () => {
    // If user didn't change the value and we have an AI suggestion, show badge
    if (aiSuggestion && inputValue === aiSuggestion) {
      setShowInput(false);
    }
  };

  const autocompleteSuggestion = inputValue
    ? categories.find(
        (cat) =>
          cat.toLowerCase().startsWith(inputValue.toLowerCase()) &&
          cat.toLowerCase() !== inputValue.toLowerCase()
      )
    : null;

  return (
    <div className={`relative ${className}`}>
      {!showInput ? (
        <div className={`${className}`}>
          <button
            onClick={handleBadgeClick}
            disabled={!aiSuggestion}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-gray-100  rounded-md transition-colors text-sm cursor-pointer"
          >
            <Sparkles size={14} className="text-gray-100" />
            {aiSuggestion ? (
              <span>{aiSuggestion}</span>
            ) : (
              <Spinner className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : (
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
            onBlur={handleInputBlur}
            placeholder={placeholder}
            style={{ zIndex: 2 }}
            className="md:text-xs"
          />
        </div>
      )}
    </div>
  );

  //   if (shouldShowBadge) {
  //     return (
  //       <div className={`${className}`}>
  //         <button
  //           onClick={handleBadgeClick}
  //           className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-gray-100  rounded-md transition-colors text-sm cursor-pointer"
  //         >
  //           <Sparkles size={14} className="text-gray-100" />
  //           {aiSuggestion ? <Spinner /> : <span>{aiSuggestion}</span>}
  //         </button>
  //       </div>
  //     );
  //   }

  //   return (
  //     <div className={`relative ${className}`}>
  //       <div className="relative">
  //         {autocompleteSuggestion && (
  //           <div
  //             className="absolute inset-0 px-3 py-2 text-sm text-gray-400 pointer-events-none bg-transparent border border-transparent rounded-md"
  //             style={{ zIndex: 1 }}
  //           >
  //             <span className="invisible">{inputValue}</span>
  //             <span>{autocompleteSuggestion.slice(inputValue.length)}</span>
  //           </div>
  //         )}
  //         <Input
  //           ref={inputRef}
  //           type="text"
  //           value={inputValue}
  //           onChange={handleInputChange}
  //           onKeyDown={handleKeyDown}
  //           onFocus={handleFocus}
  //           onBlur={handleInputBlur}
  //           placeholder={placeholder}
  //           style={{ zIndex: 2 }}
  //           className="md:text-xs"
  //         />
  //       </div>
  //     </div>
  //   );
};
