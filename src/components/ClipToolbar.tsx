import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Check, X } from "lucide-react";
import Spinner from "./Spinner";

interface ClipContext {
  content_preview: string;
  suggested_category?: string;
  user_category?: string;
  user_notes?: string;
}

interface ClipMetadata {
  clip_json: string;
  db_path: string;
}

export const ClipToolbar: React.FC = () => {
  const [clipData, setClipData] = useState<ClipContext | null>(null);
  const [clipMetadata, setClipMetadata] = useState<ClipMetadata | null>(null);
  const [userCategory, setUserCategory] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Predefined categories for the dropdown
  const categories = [
    "code_snippet",
    "technical_advice",
    "documentation",
    "url",
    "credentials",
    "data",
    "communication",
    "notes",
    "reference",
    "creative",
    "business",
    "academic",
    "error_log",
    "command",
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
      await invoke("submit_clip", {
        userCategory:
          userCategory.trim() ||
          clipData?.suggested_category ||
          "uncategorized",
        userNotes: userNotes.trim() || null,
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
      {/* <div className="bg-gray-100 rounded border-l-4 border-blue-500 p-3 mb-4 font-mono text-sm max-h-16 overflow-y-auto">
        {clipData.content_preview}
      </div> */}

      <Input
        id="category"
        type="text"
        value={userCategory}
        onChange={(e) => setUserCategory(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={clipData.suggested_category || "Enter category..."}
        list="category-suggestions"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
      {clipData.suggested_category && (
        <span className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
          AI: {clipData.suggested_category}
        </span>
      )}

      <Select value={userCategory} onValueChange={setUserCategory}>
        <SelectTrigger className="w-40 h-8 border-0 bg-transparent">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>{" "}
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={userNotes}
        onChange={(e) => setUserNotes(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add any additional context or notes..."
        className="resize-none"
      />
      <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
        <X />
      </Button>
      <Button onClick={handleSave} disabled={isSaving} variant="ghost">
        {isSaving ? <Spinner /> : <Check />}
      </Button>
    </div>
  );
};
