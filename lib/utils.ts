import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips HTML tags and script elements from a string to prevent XSS (Cross-Site Scripting).
 */
export function sanitizeText(text: string | undefined | null): string {
  if (!text) return "";
  // First strip block elements/script elements completely if any
  let clean = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Strip all other HTML tags
  clean = clean.replace(/<[^>]*>/g, "");
  return clean.trim();
}

