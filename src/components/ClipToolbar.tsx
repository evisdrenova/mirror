import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "./ui/button";
import { Check, X } from "lucide-react";
import Spinner from "./Spinner";
import { CategoryInput } from "./CategoryCombobox";

interface ClipContext {
  content_preview: string;
  suggested_category?: string;
  user_category?: string;
}

interface ClipMetadata {
  clip_json: string;
}

export const ClipToolbar: React.FC = () => {
  const [clipData, setClipData] = useState<ClipContext | null>(null);
  const [clipMetadata, setClipMetadata] = useState<ClipMetadata | null>(null);
  const [userCategory, setUserCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Predefined categories for the dropdown
  const categories = [
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

  useEffect(() => {
    // Listen for clip metadata
    const unlistenMetadata = listen<ClipMetadata>("clip-metadata", (event) => {
      setClipMetadata(event.payload);
    });

    // Listen for clip data with AI suggestion
    const unlistenData = listen<ClipContext>("clip-data", (event) => {
      setClipData(event.payload);
      setIsLoading(false);

      // Auto-fill category placeholder with AI suggestion
      if (event.payload.suggested_category && !userCategory) {
        setUserCategory("");
      }
    });

    // Auto-focus category input when component mounts
    const categoryInput = document.getElementById(
      "category"
    ) as HTMLInputElement;
    if (categoryInput) {
      categoryInput.focus();
    }

    return () => {
      unlistenMetadata.then((fn) => fn());
      unlistenData.then((fn) => fn());
    };
  }, [userCategory]);

  const handleSave = async () => {
    if (!clipMetadata) {
      console.error("No clip metadata available");
      return;
    }

    setIsSaving(true);
    try {
      console.log("trying to save clip");
      await invoke("submit_clip", {
        userCategory:
          userCategory.trim() ||
          clipData?.suggested_category ||
          "uncategorized",
        clipJson: clipMetadata.clip_json,
      });
    } catch (error) {
      console.error("Failed to save clip:", error);
      alert("Failed to save clip: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    console.log("close window");
    window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isLoading || !clipData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-row items-center gap-2 px-1 toolbar-container ">
      <CategoryInput
        value={userCategory}
        onChange={(e: string) => setUserCategory(e)}
        onKeyDown={handleKeyDown}
        placeholder={clipData.suggested_category || "Enter category..."}
        categories={categories}
        aiSuggestion={clipData.suggested_category}
      />
      <Button
        variant="ghost"
        onClick={handleCancel}
        disabled={isSaving}
        size="sm"
        className="hover:bg-gray-200"
      >
        <X />
      </Button>
      <Button
        onClick={handleSave}
        disabled={isSaving}
        variant="ghost"
        className="hover:bg-gray-200"
        size="sm"
      >
        {isSaving ? <Spinner /> : <Check />}
      </Button>
    </div>
  );
};
