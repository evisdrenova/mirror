import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./globals.css";
import { errorToast } from "./components/ui/toast";
import Spinner from "./components/Spinner";
import GridVirtualizer from "./GridVirtualizer";

export interface ClipItem {
  id: string;
  clip: {
    Text?: { plain: string };
    Image?: { data: number[]; width: number; height: number };
  };
  created_at: string;
  category?: string;
}

export default function App() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>();

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

  return (
    <div className="h-screen flex flex-col">
      {" "}
      {/* Add h-screen and flex */}
      <div className="mx-20 flex-1 flex flex-col">
        {" "}
        {/* Add flex-1 and flex flex-col */}
        <div className="my-6 flex-shrink-0">
          {" "}
          {/* Add flex-shrink-0 to prevent header shrinking */}
          <h1 className="text-2xl font-bold text-gray-900">Mirror</h1>
        </div>
        <div className="flex-1 min-h-0">
          {" "}
          {/* Add flex-1 and min-h-0 */}
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Loading clips...</div>
            </div>
          ) : (
            <GridVirtualizer items={items} getItems={getItems} />
          )}
        </div>
        {items.length === 0 && !isLoadingItems && (
          <div className="text-center py-8 text-gray-500">
            <p>
              No clips yet. Copy something and press Cmd+Shift+S to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
