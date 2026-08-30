"use client";

import { useSelect } from "downshift";
import { Icon } from "@/components/Icon";

export interface PlainSelectOption {
  value: string;
  label: string;
}

interface PlainSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: PlainSelectOption[];
  /** Shown when nothing is picked, and offered as the entry that clears the
   *  filter. Omit for a dropdown that always holds a value, like the sort. */
  placeholder?: string;
}

// A dropdown with no search box, for the short lists where typing would be
// pointless. SearchableSelect is the same control with a filter on top; both
// draw their own menu rather than leaving it to a native <select>, whose
// option list the browser paints itself and no stylesheet of ours can reach —
// on a transparent field in dark mode that came out white on white and could
// only be read by hovering each row.
export default function PlainSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
}: PlainSelectProps) {
  const items = placeholder
    ? [{ value: "", label: placeholder }, ...options]
    : options;

  const selected = items.find((item) => item.value === value) ?? items[0];

  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    highlightedIndex,
  } = useSelect({
    id,
    items,
    selectedItem: selected,
    itemToString: (item) => item?.label ?? "",
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) onChange(selectedItem.value);
    },
  });

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        {...getToggleButtonProps()}
        className="flex w-auto max-w-[170px] items-center truncate rounded-xl border border-[var(--accent)]/20 bg-transparent py-2.5 pl-3 pr-7 text-left text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
      >
        <span className="truncate">{selected?.label}</span>
      </button>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 flex w-7 items-center justify-center text-[var(--text-muted)]"
      >
        <Icon icon="mdi:chevron-down" className="h-4 w-4" />
      </span>

      <ul
        {...getMenuProps()}
        className={`scroll-visible absolute inset-x-0 top-full z-30 mt-1 max-h-64 min-w-max overflow-y-auto rounded-lg border border-[var(--border-color)] bg-white py-1 shadow-lg dark:bg-[var(--bg-blue)] ${
          isOpen ? "" : "hidden"
        }`}
      >
        {isOpen &&
          items.map((item, index) => (
            <li
              key={item.value}
              {...getItemProps({ item, index })}
              className={`cursor-pointer px-4 py-2 text-sm text-[var(--text-primary)] ${
                highlightedIndex === index ? "bg-[var(--hover-bg)]" : ""
              }`}
            >
              {item.label}
            </li>
          ))}
      </ul>
    </div>
  );
}
