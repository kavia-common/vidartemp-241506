import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * PUBLIC_INTERFACE
 * Merge conditional className values into a single Tailwind-safe string.
 *
 * Note: This preserves the existing runtime behavior by passing the full `inputs`
 * array into `clsx` (do not spread).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
