import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import "./globals.css";
import { Settings, Keyboard, Key, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

interface SettingsDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (val: boolean) => void;
}

export default function SettingsDialog(props: SettingsDialogProps) {
  const { dialogOpen, setDialogOpen } = props;

  const [globalShortcut, setGlobalShortcut] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (dialogOpen) {
      loadSettings();
    }
  }, [dialogOpen]);

  const loadSettings = async () => {
    try {
      const shortcut = await invoke<string>("get_global_hotkey");
      const apiKey = await invoke<{ get_setting: string } | null>(
        "get_setting",
        {
          key: "llm_api_key",
        }
      );

      setGlobalShortcut(shortcut || "CommandOrControl+Shift+C");
      setLlmApiKey(apiKey?.get_setting || "");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Save global shortcut
      await invoke("set_global_hotkey", { hotkey: globalShortcut });

      // Save LLM API key
      await invoke("set_setting", {
        key: "llm_api_key",
        value: llmApiKey,
      });

      setHasChanges(false);
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShortcutChange = (value: string) => {
    setGlobalShortcut(value);
    setHasChanges(true);
  };

  const handleApiKeyChange = (value: string) => {
    setLlmApiKey(value);
    setHasChanges(true);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium">
                  Global Hotkey Combination
                </div>
                <Input
                  id="global-shortcut"
                  value={globalShortcut}
                  onChange={(e) => handleShortcutChange(e.target.value)}
                  placeholder="CommandOrControl+Shift+C"
                  className="mt-1 placeholder:text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use modifiers like CommandOrControl, Shift, Alt, and keys like
                  A-Z, 0-9
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium">OpenAI API Key</div>
                <div className="relative mt-1">
                  <Input
                    id="llm-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={llmApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10  placeholder:text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Required for automatic categorization and summarization
                  features
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center">
          <div className="flex items-center gap-2 justify-between w-full ">
            <DialogClose asChild>
              <Button variant="outline" className="text-xs">
                Cancel
              </Button>
            </DialogClose>

            <Button
              onClick={saveSettings}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 text-xs"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
