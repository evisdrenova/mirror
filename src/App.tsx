import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./globals.css";
import { errorToast } from "./components/ui/toast";
import GridVirtualizer from "./GridVirtualizer";
import { SettingsIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import SettingsDialog from "./SettingsDialog";

export interface ClipItem {
  id: string;
  clip: {
    Text?: { plain: string };
    Image?: { data: string; width: number; height: number };
  };
  created_at: string;
  category?: string;
  summary?: string;
  tags?: string[];
}
export default function App() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const getItems = async () => {
    setIsLoadingItems(true);
    try {
      const items = await invoke<ClipItem[]>("get_items");
      console.log("items", items);
      setItems(items);
    } catch (error) {
      console.log("error", error);
      errorToast("Unable to fetch items");
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    getItems();

    const unlistenSaved = listen("clip-saved", () => {
      getItems();
    });

    const unlistenDeleted = listen("clip-deleted", () => {
      getItems();
    });

    return () => {
      unlistenSaved.then((fn) => fn());
      unlistenDeleted.then((fn) => fn());
    };
  }, []);

  console.log("the dialog", dialogOpen);
  return (
    <div className="h-screen flex flex-col">
      <div className="mx-20 flex-1 flex flex-col">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="my-6 flex-shrink-0 pl-2 ">
            <img src="/mirr-big.svg" width={20} height="20" />
          </div>
          <div>
            <Button variant="ghost" onClick={() => setDialogOpen(true)}>
              <SettingsIcon />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Loading clips...</div>
            </div>
          ) : (
            <GridVirtualizer items={items} getItems={getItems} />
          )}
        </div>
      </div>
      <SettingsDialog dialogOpen={dialogOpen} setDialogOpen={setDialogOpen} />
    </div>
  );
}
