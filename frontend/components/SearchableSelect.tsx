"use client";

import { useMemo, useState } from "react";
import { useCombobox } from "downshift";
import { Icon } from "@/components/Icon";
import { fold } from "@/lib/fold";

interface SearchableSelectProps {
  id: string;
  /** Placeholder text, and the accessible name. There is no visible label. */
  label: string;
  /** The caller drops anything already picked. */
  options: string[];
  onSelect: (value: string) => void;
  /** Display text, where it differs from the value. */
  labelFor?: (option: string) => string;
  emptyText: string;
}

// A filter dropdown you can type into. Not SuggestInput, which keeps whatever
// you type: a filter only accepts values that exist in the data, so typing
// alone does nothing here and you have to pick one.
export default function SearchableSelect({
  id,
  label,
  options,
  onSelect,
  labelFor,
  emptyText,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return options;

    // Match the label too: the role shown as "Other" is stored as "Unclassified".
    return options.filter((option) => {
      const shown = labelFor ? labelFor(option) : option;
      return fold(option).includes(needle) || fold(shown).includes(needle);
    });
  }, [options, query, labelFor]);

  const {
    isOpen,
    getInputProps,
    getMenuProps,
    getItemProps,
    getToggleButtonProps,
    highlightedIndex,
    reset,
  } = useCombobox({
    id,
    items,
    inputValue: query,
    // The pick becomes a chip in the parent, so this field never holds it.
    selectedItem: null,
    onInputValueChange: ({ inputValue }) => setQuery(inputValue ?? ""),
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      onSelect(selectedItem);
      setQuery("");
      reset();
    },
  });

  return (
    <div className="relative shrink-0">
      <input
        {...getInputProps({
          placeholder: label,
          "aria-label": label,
          autoComplete: "off",
          // A select is as wide as its text; an input is 20 characters unless
          // told otherwise. Sizing to the placeholder keeps this the same width
          // as the plain dropdowns beside it. Plus two for the chevron.
          size: label.length + 2,
        })}
        className="w-auto max-w-[170px] truncate rounded-xl border border-[var(--accent)]/20 bg-transparent py-2.5 pl-3 pr-7 text-sm font-medium text-[var(--text-primary)] outline-none placeholder:font-medium placeholder:text-[var(--text-primary)] focus:border-[var(--accent-2)]"
      />

      <button
        type="button"
        {...getToggleButtonProps()}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-7 items-center justify-center text-[var(--text-muted)]"
      >
        <Icon icon="mdi:chevron-down" className="h-4 w-4" />
      </button>

      <ul
        {...getMenuProps()}
        className={`scroll-visible absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-white py-1 shadow-lg dark:bg-[var(--bg-blue)] ${
          isOpen ? "" : "hidden"
        }`}
      >
        {isOpen && items.length === 0 && (
          <li className="px-4 py-2 text-sm text-[var(--text-muted)]">{emptyText}</li>
        )}

        {isOpen &&
          items.map((item, index) => (
            <li
              key={item}
              {...getItemProps({ item, index })}
              className={`cursor-pointer px-4 py-2 text-sm text-[var(--text-primary)] ${
                highlightedIndex === index ? "bg-[var(--hover-bg)]" : ""
              }`}
            >
              {labelFor ? labelFor(item) : item}
            </li>
          ))}
      </ul>
    </div>
  );
}
