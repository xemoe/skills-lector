"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { type Locale, LOCALE_COOKIE } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

interface LanguageContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      // Persist so server components pick up the new locale on refresh.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      setLocaleState(next);
      // Re-render server components (page headings, detail pages) in the new locale.
      router.refresh();
    },
    [locale, router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, t: getDictionary(locale), setLocale }),
    [locale, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

/** Shorthand for components that only need the translation dictionary. */
export function useT(): Dictionary {
  return useLanguage().t;
}
