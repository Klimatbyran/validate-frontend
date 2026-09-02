import type { SaveReportsListResponse } from "@/tabs/crawler/lib/crawler-types";

export type RegistrySaveResponseType =
  | "empty"
  | "success"
  | "partial"
  | "failed";

export function registrySaveResponseType(
  response: SaveReportsListResponse | null,
  options?: { treatEmptyAsNull?: boolean },
): RegistrySaveResponseType | null {
  if (!response) return null;

  if (response.successes.length === 0 && response.failed.length === 0) {
    return options?.treatEmptyAsNull ? null : "empty";
  }
  if (response.failed.length === 0) return "success";
  if (response.successes.length > 0) return "partial";
  return "failed";
}

export function registrySaveResponseStatusClassName(
  responseType: RegistrySaveResponseType | null,
): string {
  if (responseType === "success") return "text-green-03";
  if (responseType === "partial") return "text-yellow-400";
  if (responseType === "failed") return "text-pink-03";
  return "text-gray-01";
}
