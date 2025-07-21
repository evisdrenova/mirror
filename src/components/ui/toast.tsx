import { toast } from "sonner";
import { Check, AlertCircle } from "lucide-react";

type ToastOptions = Parameters<typeof toast>[1];

export const successToast = (
  title: string,
  options?: Omit<ToastOptions, "unstyled" | "classNames">
) => {
  return toast.success(title, {
    unstyled: true,
    icon: <Check className="h-3 w-3 text-green-500" />,
    classNames: {
      toast:
        "p-2 rounded-lg shadow-lg flex items-center gap-3 bg-gray-200 dark:bg-zinc-800 ring ring-green-900",
      title: "text-xs font-normal text-zinc-900 dark:text-zinc-300",
      description: "text-xs text-zinc-600 dark:text-zinc-400 mt-1",
      actionButton:
        "bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600",
      cancelButton:
        "bg-zinc-200 dark:bg-zinc-700 text-xs px-2 py-1 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600",
      closeButton:
        "text-zinc-400 hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400",
    },
    ...options,
  });
};

export const errorToast = (
  title: string,
  options?: Omit<ToastOptions, "unstyled" | "classNames">
) => {
  return toast.error(title, {
    unstyled: true,
    icon: <AlertCircle className="h-3 w-3 text-red-500" />,
    classNames: {
      toast:
        "p-2 rounded-lg shadow-lg flex items-center gap-3 bg-gray-200 dark:bg-zinc-800 ring ring-red-900",
      title: "text-xs font-normal text-zinc-900 dark:text-zinc-300",
      description: "text-xs text-zinc-600 dark:text-zinc-400 mt-1",
      actionButton:
        "bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600",
      cancelButton:
        "bg-zinc-200 dark:bg-zinc-700 text-xs px-2 py-1 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600",
      closeButton:
        "text-zinc-400 hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400",
    },
    ...options,
  });
};
