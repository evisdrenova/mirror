import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./globals.css";
import { errorToast } from "./components/ui/toast";

interface ClipItem {
  id: string;
  clip: {
    Text?: { plain: string };
    Image?: { data: number[]; width: number; height: number };
  };
  created_at: string;
}
function App() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>();

  useEffect(() => {
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

    getItems();
  }, []);

  return (
    <div>
      <div className="mx-20">
        <div>This is mirror </div>
        <div>
          {items.map((item, index) => (
            <div key={item.id || index}>
              <div>ID: {item.id}</div>
              <div>Created: {item.created_at}</div>
              <div>Clip: {JSON.stringify(item.clip)}</div>
              <hr />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
