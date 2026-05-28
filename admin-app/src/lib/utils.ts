import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns 1-2 letter initials from a name, or null if name is invalid/unknown */
export function getInitials(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase().startsWith('unknown')) return null;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1 && parts[0].length === 1) return null; // single char
  return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
