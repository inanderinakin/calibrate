import { registerLocale, getName, getNames, getAlpha2Code } from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import tr from "i18n-iso-countries/langs/tr.json";
import type { Language } from "@/contexts/LanguageContext";

// The country names come from i18n-iso-countries (~8KB per language) rather
// than a list we maintain: it is the ISO 3166-1 set, already translated, and
// it means "Türkiye" and "Turkey" are the same country to us instead of two
// strings that happen to sit in the same field.
registerLocale(en);
registerLocale(tr);

const byLanguage: Partial<Record<Language, string[]>> = {};

/** Every country, named in the language the user is reading the app in. */
export function countrySuggestions(language: Language): string[] {
  const cached = byLanguage[language];
  if (cached) return cached;

  // Turkish sorts Ç after C and İ after I, so the collation has to follow the
  // language rather than code-point order.
  const names = Object.values(getNames(language, { select: "official" })).sort(
    (a, b) => a.localeCompare(b, language),
  );

  byLanguage[language] = names;
  return names;
}

const aliasesByLanguage: Partial<Record<Language, Record<string, string[]>>> = {};

/**
 * The other names each country answers to, keyed by the name we display.
 * The data lists them officially-first ("Türkiye", then "Turkey"), so we show
 * the official one and keep the rest searchable, otherwise someone typing
 * "Turkey" or "UK" in English gets no suggestion at all.
 */
export function countryAliases(language: Language): Record<string, string[]> {
  const cached = aliasesByLanguage[language];
  if (cached) return cached;

  const aliases: Record<string, string[]> = {};
  for (const names of Object.values(getNames(language, { select: "all" }))) {
    const [display, ...rest] = names;
    if (rest.length > 0) aliases[display] = rest;
  }

  aliasesByLanguage[language] = aliases;
  return aliases;
}

/**
 * What we store for a country: its ISO alpha-2 code when we recognise the
 * name, otherwise whatever was typed. Storing the code keeps the value stable
 * when the reading language changes. A profile saved as "Türkiye" would
 * otherwise still read "Türkiye" after switching the app to English.
 */
export function toStoredCountry(input: string, language: Language): string {
  const name = input.trim();
  if (!name) return "";

  return getAlpha2Code(name, language) ?? name;
}

/** Turns a stored country back into a name to show. */
export function countryLabel(stored: string, language: Language): string {
  if (!stored) return "";

  // Only a two-letter value can be one of our codes; anything else is free
  // text the user typed and is shown back as-is.
  if (stored.length !== 2) return stored;

  return getName(stored, language, { select: "official" }) ?? stored;
}
