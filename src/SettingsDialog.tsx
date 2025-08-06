import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useRecordHotkeys } from "react-hotkeys-hook";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import "./globals.css";
import { Settings, Eye, EyeOff, Keyboard, Play, Check, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import Spinner from "./components/Spinner";
import { errorToast } from "./components/ui/toast";

type TestResult = "success" | "error" | null;

interface SettingsDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (val: boolean) => void;
  globalShortcut: string;
  setGlobalShortcut: (val: string) => void;
  llmApiKey: string;
  setLlmApiKey: (val: string) => void;
  hasChanges: boolean;
  setHasChanges: (val: boolean) => void;
}

export default function SettingsDialog(
  props: SettingsDialogProps
): JSX.Element {
  const {
    dialogOpen,
    setDialogOpen,
    globalShortcut,
    setGlobalShortcut,
    llmApiKey,
    setLlmApiKey,
    hasChanges,
    setHasChanges,
  } = props;

  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const [keys, { start, stop, isRecording }] = useRecordHotkeys();

  const saveSettings = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await invoke<void>("set_global_hotkey", { hotkey: globalShortcut });
      await invoke<void>("set_setting", {
        key: "llm_api_key",
        value: llmApiKey,
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      errorToast("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShortcutChange = (value: string): void => {
    setGlobalShortcut(value);
    setHasChanges(true);
    setTestResult(null);
  };

  const handleApiKeyChange = (value: string): void => {
    setLlmApiKey(value);
    setHasChanges(true);
  };

  // formats the hotkey for the backend
  const formatHotkey = (recordedKeys: Set<string>): string => {
    const modifiers: string[] = [];
    const regularKeys: string[] = [];

    recordedKeys.forEach((key: string) => {
      const lower = key.toLowerCase();
      if (lower === "control" || lower === "ctrl") {
        if (!modifiers.includes("CommandOrControl")) {
          modifiers.push("CommandOrControl");
        }
      } else if (lower === "meta" || lower === "cmd" || lower === "command") {
        if (!modifiers.includes("CommandOrControl")) {
          modifiers.push("CommandOrControl");
        }
      } else if (lower === "shift") {
        if (!modifiers.includes("Shift")) {
          modifiers.push("Shift");
        }
      } else if (lower === "alt" || lower === "option") {
        if (!modifiers.includes("Alt")) {
          modifiers.push("Alt");
        }
      } else if (
        key.length === 1 ||
        [
          "F1",
          "F2",
          "F3",
          "F4",
          "F5",
          "F6",
          "F7",
          "F8",
          "F9",
          "F10",
          "F11",
          "F12",
          "Space",
          "Enter",
          "Escape",
          "Tab",
          "Backspace",
          "Delete",
          "Insert",
          "Home",
          "End",
          "PageUp",
          "PageDown",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(key)
      ) {
        regularKeys.push(key.toUpperCase());
      }
    });

    return [...modifiers, ...regularKeys].join("+");
  };

  const startCapture = (): void => {
    setTestResult(null);
    start();
  };

  const finishCapture = (): void => {
    if (keys.size > 0) {
      const formatted = formatHotkey(keys);
      setGlobalShortcut(formatted);
      setHasChanges(true);
    }
    stop();
  };

  const testHotkey = async (): Promise<void> => {
    if (!globalShortcut.trim()) {
      errorToast("Please enter a hotkey combination first");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      await invoke<void>("test_global_hotkey", { hotkey: globalShortcut });
      setTestResult("success");

      setTimeout((): void => {
        setTestResult(null);
      }, 3000);
    } catch (error) {
      console.error("Hotkey test failed:", error);
      setTestResult("error");
      errorToast(`Invalid hotkey: ${error}`);

      setTimeout((): void => {
        setTestResult(null);
      }, 5000);
    } finally {
      setIsTesting(false);
    }
  };

  // Display current recording state
  const getDisplayText = (): string => {
    if (isRecording) {
      if (keys.size === 0) {
        return "Press keys...";
      }
      // Debug: Show raw keys being recorded
      const rawKeys = Array.from(keys);
      console.log("Raw keys in display:", rawKeys);
      return rawKeys.join("+");
    }
    return globalShortcut;
  };

  // Stop recording when dialog closes
  useEffect((): void => {
    if (!dialogOpen && isRecording) {
      stop();
    }
  }, [dialogOpen, isRecording, stop]);

  // Auto-finish capture when user releases keys and has a valid combination
  useEffect(() => {
    if (isRecording && keys.size > 0) {
      // Check if we have at least one modifier and one regular key
      const hasModifier = Array.from(keys).some((key) =>
        ["control", "meta", "shift", "alt", "cmd", "command"].includes(
          key.toLowerCase()
        )
      );
      const hasRegularKey = Array.from(keys).some(
        (key) =>
          !["control", "meta", "shift", "alt", "cmd", "command"].includes(
            key.toLowerCase()
          )
      );

      if (hasModifier && hasRegularKey) {
        // Automatically finish after a short delay to allow for complex combinations
        const timer = setTimeout(() => {
          finishCapture();
        }, 800);

        return () => clearTimeout(timer);
      }
    }
  }, [keys, isRecording]);

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
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 relative">
                    <Input
                      id="global-shortcut"
                      value={getDisplayText()}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (!isRecording) {
                          handleShortcutChange(e.target.value);
                        }
                      }}
                      placeholder={
                        isRecording
                          ? "Press your hotkey combination..."
                          : "CommandOrControl+Shift+C"
                      }
                      className={`placeholder:text-xs ${
                        isRecording ? "ring-2 ring-blue-500 bg-blue-50" : ""
                      }`}
                      readOnly={isRecording}
                    />
                    {isRecording && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={isRecording ? finishCapture : startCapture}
                    className="px-3 text-xs"
                  >
                    <Keyboard className="w-4 h-4" />
                    {isRecording ? "Finish" : "Capture"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testHotkey}
                    disabled={
                      isTesting || !globalShortcut.trim() || isRecording
                    }
                    className="px-3 text-xs"
                  >
                    {isTesting ? (
                      <Spinner />
                    ) : testResult === "success" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : testResult === "error" ? (
                      <X className="w-4 h-4 text-red-600" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Test
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isRecording
                    ? "Press and hold modifiers (Ctrl/Cmd, Shift, Alt) then press a key. Release to capture."
                    : "Use modifiers like CommandOrControl, Shift, Alt, and keys like A-Z, 0-9"}
                </p>
                {testResult === "success" && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Hotkey is valid and ready to use!
                  </p>
                )}
                {testResult === "error" && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    This hotkey combination is invalid or already in use.
                  </p>
                )}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleApiKeyChange(e.target.value)
                    }
                    placeholder="sk-..."
                    className="pr-10  placeholder:text-xs"
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowApiKey(!showApiKey)}
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
          <div className="flex items-center gap-2 justify-between w-full">
            <DialogClose asChild>
              <Button variant="outline" className="text-xs" size="sm">
                Cancel
              </Button>
            </DialogClose>

            <Button
              onClick={saveSettings}
              disabled={isSaving || !hasChanges || isRecording}
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              {isSaving ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                <>Save</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
