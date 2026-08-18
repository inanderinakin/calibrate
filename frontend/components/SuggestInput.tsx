"use client";

import { useMemo } from "react";
import { useCombobox } from "downshift";

// Matching is accent- and case-insensitive so someone typing on a keyboard
// without Turkish characters still finds their answer: "muhendislik" has to
// match "Mühendisliği". Lowercasing with the Turkish locale first ("I" -> "ı",
// "İ" -> "i"), then stripping the combining marks NFD splits off (ü -> u,
// ğ -> g, ç -> c, ş -> s), then folding the dotless "ı" onto "i" — which does
// not decompose, so it needs its own pass.
function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

interface SuggestInputProps {
  /** Used as the id prefix for the input, label and listbox. */
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  /**
   * Extra terms a suggestion should match on, keyed by the suggestion itself.
   * Lets a list show one name per entry while still being searchable by the
   * others someone might type ("Turkey" for "Türkiye", "UK" for "United
   * Kingdom").
   */
  aliases?: Record<string, string[]>;
  required?: boolean;
  /** How many matches to show at once. */
  limit?: number;
}

/**
 * Text field with a filtered suggestion list. Suggestions are a shortcut, not
 * a constraint — anything typed is kept, so this suits fields where our list
 * cannot be exhaustive (field of study, country...).
 */
export default function SuggestInput({
  id,
  label,
  value,
  onChange,
  suggestions,
  aliases,
  required = false,
  limit = 8,
}: SuggestInputProps) {
  const items = useMemo(() => {
    const query = fold(value.trim());
    // An empty field offers the head of the list rather than nothing, so the
    // suggestions are discoverable before you know what to type.
    const matches = query
      ? suggestions.filter(
          (suggestion) =>
            fold(suggestion).includes(query) ||
            (aliases?.[suggestion] ?? []).some((alias) =>
              fold(alias).includes(query),
            ),
        )
      : suggestions;

    return matches.slice(0, limit);
  }, [suggestions, aliases, value, limit]);

  const {
    isOpen,
    getLabelProps,
    getInputProps,
    getMenuProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    id,
    items,
    inputValue: value,
    // Fires both for typing and for picking an item off the list.
    onInputValueChange: ({ inputValue }) => onChange(inputValue ?? ""),
  });

  const showMenu = isOpen && items.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        {...getLabelProps()}
        className="text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...getInputProps({ required, autoComplete: "off" })}
          className="glass-input w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />

        {/* getMenuProps holds a ref downshift needs on every render, so the
            list stays mounted and is hidden with a class instead. */}
        <ul
          {...getMenuProps()}
          className={`absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-white py-1 shadow-lg dark:bg-[var(--bg-blue)] ${
            showMenu ? "" : "hidden"
          }`}
        >
          {showMenu &&
            items.map((item, index) => (
              <li
                key={item}
                {...getItemProps({ item, index })}
                className={`cursor-pointer px-4 py-2 text-sm text-[var(--text-primary)] ${
                  highlightedIndex === index ? "bg-[var(--hover-bg)]" : ""
                }`}
              >
                {item}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
