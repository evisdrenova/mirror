import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(
  dateStr?: string | Date | number,
  is24Hour = false
): string | undefined {
  if (!dateStr) {
    return undefined;
  }

  let date: Date;

  if (dateStr instanceof Date) {
    date = dateStr;
  } else if (typeof dateStr === "number") {
    date = new Date(dateStr);
  } else {
    if (typeof dateStr === "string") {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        date = new Date(dateStr + "Z");
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }
  }

  if (isNaN(date.getTime())) {
    return undefined;
  }

  const hourFormat = is24Hour ? "HH" : "hh";
  const amPm = is24Hour ? "" : " a";

  return format(date, `MM/dd/yyyy ${hourFormat}:mm:ss${amPm}`);
}
export const isUrl = (text: string) => /^https?:\/\/[^\s]+$/.test(text);
