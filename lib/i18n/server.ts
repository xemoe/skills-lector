import { cookies } from "next/headers";
import { type Locale, LOCALE_COOKIE, DEFAULT_LOCALE, isLocale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/** Reads the chosen locale from the request cookie — for use in server components. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Resolves the locale and its dictionary in one call. */
export async function getServerI18n(): Promise<{
  locale: Locale;
  t: Dictionary;
}> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
