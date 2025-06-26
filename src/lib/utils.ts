import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Checks if text contains markdown formatting patterns on any line:
// Headers (# Title), lists (- item, 1. item), blockquotes (> text), 
// code blocks (```), or tables (| col |). Will match simple text 
// like "- buy milk" but that's acceptable for this use case.
export function isMarkdown(value: string) {
  return /^(#{1,6}\s|[-*+]\s|>\s|\d+\.\s|```|\|.*\|)/m.test(value);
}