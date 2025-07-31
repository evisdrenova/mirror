import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import "./globals.css";
import { formatDateTime } from "./lib/utils";
import { Calendar, Folder, Tags, Trash } from "lucide-react";
import { ClipItem } from "./App";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { renderClipContent } from "./GridVirtualizer";

interface ClipDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (val: boolean) => void;
  selectedItem: ClipItem | null;
  handleDelete: (itemId: string) => Promise<void>;
  isDeleting: boolean;
  searchQuery?: string;
}

export default function ClipDialog(props: ClipDialogProps) {
  const {
    dialogOpen,
    setDialogOpen,
    selectedItem,
    handleDelete,
    isDeleting,
    searchQuery,
  } = props;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Clip Details</DialogTitle>
        </DialogHeader>
        <div className="">
          {selectedItem && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex flex-row justify-between">
                  <div className="mb-2 flex flex-col gap-2">
                    <div className="flex flex-row items-center gap-1 text-xs">
                      <Folder className="w-3 h-3 text-gray-500" />
                      <Badge className="bg-gray-100 text-[10px] text-gray-800 border border-gray-300">
                        {selectedItem.category || "Other"}
                      </Badge>
                    </div>
                    <div className="flex flex-row items-center gap-1">
                      <Tags className="w-3 h-3 text-gray-500" />
                      {selectedItem.tags &&
                        selectedItem.tags.map((t) => (
                          <Badge
                            className="bg-blue-100 text-blue-800 text-[10px] rounded-full py-0"
                            key={t}
                          >
                            {t}
                          </Badge>
                        ))}
                    </div>

                    <div className="text-[10px] text-gray-400 mt-auto flex flex-row items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(selectedItem.created_at)}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedItem.id);
                  }}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                  className="ml-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              <div className="mb-4 max-h-96 overflow-auto border rounded p-3 bg-gray-50">
                {renderClipContent(
                  selectedItem.clip,
                  false,
                  searchQuery,
                  selectedItem.category
                )}
              </div>
              {selectedItem.summary && (
                <div className="mb-4 max-h-96 overflow-auto border rounded p-3 bg-blue-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Summary:
                  </h4>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {highlightSearchTerm(selectedItem.summary, searchQuery)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const highlightSearchTerm = (text: string, searchQuery?: string) => {
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  const query = searchQuery.trim();
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};
