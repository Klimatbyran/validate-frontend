import React, { createContext, useCallback, useMemo, useState } from "react";
import en from "@/i18n/en.json";
import sv from "@/i18n/sv.json";

export type Locale = "en" | "sv";

const translations: Record<Locale, Record<string, unknown>> = { en, sv };

const STORAGE_KEY = "validate-locale";

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "sv") return stored;
  } catch {
    // ignore
  }
  return "en";
}

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ""));
}

/** BCP 47 locale for Intl (dates, numbers). */
export const LOCALE_INTL: Record<Locale, string> = {
  en: "en-US",
  sv: "sv-SE",
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** BCP 47 locale for Intl (e.g. "en-US", "sv-SE"). Use with toLocaleString, Intl.NumberFormat, etc. */
  localeIntl: string;
  /** Format a number for display using the selected locale. */
  formatNumber: (value: number | null | undefined) => string;
  /** Format a date for display using the selected locale. */
  formatDate: (date: Date | number | null | undefined) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const localeTranslations = translations[locale];
      const value = getNested(localeTranslations, key);
      if (value != null) return interpolate(value, params);
      // Fallback to English
      const enValue = getNested(translations.en, key);
      if (enValue != null) return interpolate(enValue, params);
      return key;
    },
    [locale]
  );

  const localeIntl = LOCALE_INTL[locale];

  const formatNumber = useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined) return "—";
      return value.toLocaleString(localeIntl);
    },
    [localeIntl]
  );

  const formatDate = useCallback(
    (date: Date | number | null | undefined): string => {
      if (date === null || date === undefined) return "—";
      const d = typeof date === "number" ? new Date(date) : date;
      return d.toLocaleString(localeIntl);
    },
    [localeIntl]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, localeIntl, formatNumber, formatDate }),
    [locale, setLocale, t, localeIntl, formatNumber, formatDate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
