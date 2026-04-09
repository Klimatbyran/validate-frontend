export const inputClassName =
  "w-full max-w-md px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03";

export function displayBaseYear(value: unknown, placeholder: string): string {
  if (value == null) return placeholder;
  if (typeof value === "number") return String(value);
  if (
    typeof value === "object" &&
    value !== null &&
    "year" in value &&
    typeof (value as { year: unknown }).year === "number"
  )
    return String((value as { year: number }).year);
  return placeholder;
}

export function displayText(value: unknown, placeholder: string): string {
  if (value == null) return placeholder;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as { text: unknown }).text === "string"
  )
    return (value as { text: string }).text;
  return placeholder;
}

export function getDescriptionByLang(
  company: { descriptions?: Array<{ language: string; text: unknown }> },
  lang: string
): string {
  const d = company.descriptions?.find((x) => x.language === lang);
  return d && typeof d.text === "string" ? d.text : "";
}

