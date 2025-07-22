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
        <div>Mirror</div>
        <DataTable columns={columns} data={items} />
      </div>
    </div>
  );
}
