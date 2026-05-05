import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to combine Tailwind class names safely.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("vi-VN");
}
