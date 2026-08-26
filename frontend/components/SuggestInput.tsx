"use client";

import { useMemo } from "react";
import { useCombobox } from "downshift";
import { fold } from "@/lib/fold";

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
  matchMode?: "contains" | "startsWith";
  /**
   * "form" matches the heavier field styling the settings page uses for its
   * other inputs. Anything else keeps the compact look the upload page wants.
   */
  variant?: "compact" | "form";
  /** Shows the unsaved-change dot in the label. */
  changed?: boolean;
  /** Tooltip for that dot. */
  changedTitle?: string;
}

/**
 * Text field with a filtered suggestion list. Suggestions are a shortcut, not
 * a constraint. Anything typed is kept, so this suits fields where our list
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
  matchMode = "contains",
  variant = "compact",
  changed = false,
  changedTitle,
}: SuggestInputProps) {
  const items = useMemo(() => {
    const query = fold(value.trim());
    // An empty field offers the head of the list rather than nothing, so the
    // suggestions are discoverable before you know what to type.
    const matchesTerm = (term: string) =>
      matchMode === "startsWith"
        ? fold(term).startsWith(query)
        : fold(term).includes(query);

    const matches = query
      ? suggestions.filter(
          (suggestion) =>
            matchesTerm(suggestion) ||
            (aliases?.[suggestion] ?? []).some((alias) =>
              matchMode === "startsWith"
                ? fold(alias) === query
                : matchesTerm(alias),
            ),
        )
      : suggestions;

    return matches.slice(0, limit);
  }, [suggestions, aliases, value, limit, matchMode]);

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
  const form = variant === "form";

  return (
    <div className={`flex flex-col ${form ? "gap-2" : "gap-1.5"}`}>
      <label
        {...getLabelProps()}
        className={
          form
            ? "flex items-center gap-1.5 text-(--accent-bg) font-medium"
            : "text-sm font-medium text-[var(--text-primary)]"
        }
      >
        {variant === "form" && (
          <span
            title={changed ? changedTitle : undefined}
            aria-label={changed ? changedTitle : undefined}
            role={changed ? "img" : undefined}
            className={`h-2 w-2 shrink-0 rounded-full bg-(--warning) ${changed ? "" : "invisible"}`}
          />
        )}
        {label}
      </label>

      <div className="relative">
        <input
          {...getInputProps({ required, autoComplete: "off" })}
          className={`glass-input w-full text-[var(--text-primary)] outline-none ${
            form
              ? "rounded-[20px] border-2 border-(--accent-bg) px-4 py-3"
              : "rounded-lg border border-[var(--border-color)] px-4 py-2.5 focus:border-[var(--accent-2)]"
          }`}
        />

        {/* getMenuProps holds a ref downshift needs on every render, so the
            list stays mounted and is hidden with a class instead. */}
        <ul
          {...getMenuProps()}
          className={`scroll-visible absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-white py-1 shadow-lg dark:bg-[var(--bg-blue)] ${
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
