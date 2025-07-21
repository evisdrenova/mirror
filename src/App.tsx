import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./globals.css";
import { errorToast } from "./components/ui/toast";

interface Item {
  type: string;
  location: string;
  text: string;
}

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>();

  async function getItems() {
    setIsLoadingItems(true);

    try {
      const items = await invoke<Item[]>("get_items");
      setItems(items);
    } catch (error) {
      errorToast("Unable to fetch settings");
    } finally {
      setIsLoadingItems(false);
    }
  }

  return (
    <div>
      <div className="mx-20">
        <div>This is mirror </div>
        <div>
          {items.map((item) => (
            <div key={item.text}>{item.type}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
