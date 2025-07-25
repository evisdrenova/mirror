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

export const ClipToolbar: React.FC = () => {
  const [clipData, setClipData] = useState<ClipContext | null>(null);
  const [clipMetadata, setClipMetadata] = useState<ClipMetadata | null>(null);
  const [userCategory, setUserCategory] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Listen for clip metadata
    const unlistenMetadata = listen<ClipMetadata>("clip-metadata", (event) => {
      console.log("Received clip metadata:", event.payload);
      setClipMetadata(event.payload);
    });

    // Listen for clip data with AI suggestion
    const unlistenData = listen<ClipContext>("clip-data", (event) => {
      console.log("Received clip data:", event.payload);
      setClipData(event.payload);
      setIsLoadingAI(false); // AI suggestion process complete

      // Auto-fill category with AI suggestion
      if (event.payload.suggested_category && !userCategory) {
        setUserCategory(event.payload.suggested_category); // Fixed: actually set the suggestion
      }
    });

    return () => {
      unlistenMetadata.then((fn) => fn());
      unlistenData.then((fn) => fn());
    };
  }, []); // Removed userCategory dependency

  const handleSave = async () => {
    console.log("handleSave called with:", {
      clipMetadata,
      userCategory,
      clipData,
    });

    if (!clipMetadata) {
      console.error("No clip metadata available");
      console.error("Current state:", { clipMetadata, clipData });
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

  const handleCancel = async () => {
    try {
      await invoke("close_toolbar_window");
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-row items-center gap-2 px-1 toolbar-container">
      <CategoryInput
        value={userCategory}
        onChange={(e: string) => setUserCategory(e)}
        onKeyDown={handleKeyDown}
        placeholder={clipData?.suggested_category || "Enter category..."}
        categories={categories}
        aiSuggestion={clipData?.suggested_category}
        isLoadingAiCategory={isLoadingAI}
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
