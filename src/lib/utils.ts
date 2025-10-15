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



// Public Klimatkollen API base: in dev, use /kkapi (proxied to https://api.klimatkollen.se/api)
// in production, hit the absolute URL directly.
export const getPublicApiUrl = (path: string) => {
  const isProd = import.meta.env.PROD;
  if (isProd) {
    // Ensure path starts with /api
    const normalized = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
    return `https://api.klimatkollen.se${normalized}`;
  }
  // Dev: route through vite proxy
  const normalized = path.startsWith('/api') ? path.replace(/^\/api/, '') : path;
  return `/kkapi${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}