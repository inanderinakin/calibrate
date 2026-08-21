// Turkish attaches a possessive/accusative-style suffix ("%29'u", "%12'si",
// "%15'i"...) after numbers, and which vowel (+ whether an "s" buffer is
// needed) depends on how the number is actually PRONOUNCED, not its digits,
// "12" is spoken "on iki", ends in "i", so it takes "'si"; "13" is "on üç",
// ends in "ü" (a consonant "ç" before it, no buffer needed), so it's "'ü".
// Hardcoding one suffix for every number (as the code used to) is wrong for
// anything that doesn't happen to end the same way as the example it was
// written against.

const ONES = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];

// Suffix (vowel, plus a leading "s" where the word already ends in a vowel)
// for each of the Turkish number-words that can end a 0-100 reading.
const SUFFIX_BY_WORD: Record<string, string> = {
  sıfır: "ı", bir: "i", iki: "si", üç: "ü", dört: "ü",
  beş: "i", altı: "sı", yedi: "si", sekiz: "i", dokuz: "u",
  on: "u", yirmi: "si", otuz: "u", kırk: "ı", elli: "si",
  altmış: "ı", yetmiş: "i", seksen: "i", doksan: "ı", yüz: "ü",
};

function finalNumberWord(n: number): string {
  const value = Math.abs(Math.round(n)) % 100;
  if (value === 0) return n === 100 ? "yüz" : "sıfır";
  const ones = value % 10;
  return ones === 0 ? TENS[Math.floor(value / 10)] : ONES[ones];
}

/** The correct Turkish suffix (e.g. "u", "si", "ı") to attach after `n`. */
export function turkishNumberSuffix(n: number): string {
  if (Math.round(n) === 100) return SUFFIX_BY_WORD.yüz;
  return SUFFIX_BY_WORD[finalNumberWord(n)];
}

/** Turkish puts the % sign before the number ("%29"), English puts it after ("29%"). */
export function formatPercent(value: number, language: "en" | "tr"): string {
  return language === "tr" ? `%${value}` : `${value}%`;
}
