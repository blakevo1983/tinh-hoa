import vi from "./vi.json";
import en from "./en.json";

export type Locale = "vi" | "en";

const dictionaries: Record<Locale, Record<string, unknown>> = {
  vi,
  en,
};

let currentLocale: Locale = "vi";
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (currentLocale !== locale) {
    currentLocale = locale;
    listeners.forEach((listener) => listener(locale));
  }
}

export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Access nested dictionary value by dot path (e.g. "app.title").
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Translate a key path with optional replacement parameters.
 */
export function t(key: string, params?: Record<string, string>): string {
  const dict = dictionaries[currentLocale] ?? dictionaries.vi;
  let translated = getNestedValue(dict, key);

  // Fallback to Vietnamese if key not found in current locale
  if (translated === undefined && currentLocale !== "vi") {
    translated = getNestedValue(dictionaries.vi, key);
  }

  if (translated === undefined) {
    return key;
  }

  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      translated = translated.replaceAll(`{${paramKey}}`, paramVal);
    }
  }

  return translated;
}
