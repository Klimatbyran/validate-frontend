import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMarkdown(value: string) {
  return /^[\s\S]*?(#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|^\s*`{3,}|^\s*\|.*\|.*\|)/m.test(value);
}