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

  // checks to make sure that the string can be transformed into a valid date
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return undefined;
  }

  const hourFormat = is24Hour ? "HH" : "hh";
  const amPm = is24Hour ? "" : " a";
  return format(new Date(dateStr), `MM/dd/yyyy ${hourFormat}:mm:ss${amPm}`);
}
