import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./globals.css";
import { errorToast } from "./components/ui/toast";
import { DataTable } from "./components/data-table";
import { columns } from "./components/columns";

export interface ClipItem {
  id: string;
  clip: {
    Text?: { plain: string };
    Image?: { data: number[]; width: number; height: number };
  };
  created_at: string;
  category?: string;
  notes?: string;
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

    const unlisten = listen("clip-saved", () => {
      console.log("New clip saved, refreshing...");
      getItems();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div>
      <div className="mx-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mirror</h1>
          <p className="text-gray-600 text-sm">
            Clipboard manager with AI categorization
          </p>
        </div>

        {isLoadingItems ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading clips...</div>
          </div>
        ) : (
          <DataTable columns={columns} data={items} />
        )}

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
