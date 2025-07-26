import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "./ui/button";
import { Check, X } from "lucide-react";
import Spinner from "./Spinner";
import { CategoryInput } from "./CategoryCombobox";

interface ClipContext {
  suggested_category?: string;
  clip: {
    Text?: { plain: string };
    Image?: { data: number[]; width: number; height: number };
  };
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
  const [userCategory, setUserCategory] = useState("");
  const [isLoadingClipData, setIsLoadingClipData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unlistenData = listen<ClipContext>("clip-data", (event) => {
      setClipData(event.payload);
      setIsLoadingClipData(false);

      if (event.payload.suggested_category && !userCategory) {
        setUserCategory(event.payload.suggested_category);
      }
    });

    return () => {
      unlistenData.then((fn) => fn());
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke("submit_clip", {
        userCategory:
          userCategory.trim() ||
          clipData?.suggested_category ||
          "uncategorized",
        clipJson: JSON.stringify(clipData?.clip),
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
        disabled={isSaving || !clipData?.suggested_category}
        variant="ghost"
        className="hover:bg-gray-200"
        size="sm"
      >
        {isSaving ? <Spinner /> : <Check />}
      </Button>
    </div>
  );
};
