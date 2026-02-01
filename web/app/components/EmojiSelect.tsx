/**
 * EmojiSelect — custom dropdown that renders Apple emoji via the Emoji component.
 *
 * Replaces native <select> and <input list="…"><datalist> elements in admin
 * forms where emoji icons need to render as images rather than platform-native
 * Unicode glyphs.
 *
 * Two modes of operation controlled by the `freeform` prop:
 *
 *  - freeform=false (default): behaves like a <select>. The user must pick
 *    from the provided options. A hidden input carries the selected value for
 *    form submission.
 *
 *  - freeform=true: behaves like a combobox (<input> + suggestions). The user
 *    can type an arbitrary value *or* pick from filtered suggestions. Useful
 *    for fields like "badge slug" where the value may not exist yet.
 *
 * Tradeoffs vs. native elements:
 *  - Pro: emoji render as Apple images on every platform.
 *  - Pro: built-in search/filter for long option lists.
 *  - Con: more JS than a native <select> — acceptable for low-traffic admin
 *    forms, but avoid using this in hot paths or public-facing lists.
 *  - Con: native <select> gets OS-level accessibility for free (VoiceOver
 *    rotor, mobile pickers, etc.). This component uses ARIA listbox/combobox
 *    roles which cover screen readers but not mobile picker UX. Since these
 *    are desktop admin forms, the tradeoff is acceptable.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Emoji } from "~/components/Emoji";

export interface EmojiSelectOption {
  value: string;
  label: string;
  emoji?: string; // Unicode emoji character, rendered via Emoji component
}

interface EmojiSelectProps {
  name: string;
  id?: string;
  options: EmojiSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  /** Allow typing arbitrary values that aren't in the options list. */
  freeform?: boolean;
  className?: string;
}

export function EmojiSelect({
  name,
  id,
  options,
  defaultValue = "",
  placeholder = "Select\u2026",
  freeform = false,
  className = "",
}: EmojiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [search, setSearch] = useState(freeform ? defaultValue : "");
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Filter options by search query (match label or value)
  const query = freeform ? search : search;
  const filteredOptions = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  // ---- Side effects ----

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // In freeform mode the trigger IS the search input, so it's already focused
      if (!freeform) {
        searchRef.current?.focus();
      }
    }
  }, [isOpen, freeform]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions.length, search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // ---- Handlers ----

  const select = useCallback(
    (val: string) => {
      setValue(val);
      setSearch(freeform ? val : "");
      setIsOpen(false);
    },
    [freeform],
  );

  function handleTriggerClick() {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearch(freeform ? search : "");
      setHighlightIndex(0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (
        e.key === "ArrowDown" ||
        e.key === "Enter" ||
        (!freeform && e.key === " ")
      ) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) =>
          Math.min(i + 1, filteredOptions.length - 1),
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && filteredOptions[highlightIndex]) {
          select(filteredOptions[highlightIndex].value);
        } else if (freeform) {
          // Accept the typed value as-is
          setValue(search);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  }

  // ---- Render helpers ----

  const listboxId = `${id || name}-listbox`;

  function renderOption(option: EmojiSelectOption, index: number) {
    const isHighlighted = index === highlightIndex;
    const isSelected = option.value === value;

    return (
      <div
        key={option.value}
        role="option"
        aria-selected={isSelected}
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer text-sm
          ${isHighlighted ? "bg-coral/10 text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}
          ${isSelected ? "font-medium" : ""}
        `}
        onMouseEnter={() => setHighlightIndex(index)}
        onMouseDown={(e) => {
          // Prevent blur on the search input before we can read the click
          e.preventDefault();
          select(option.value);
        }}
      >
        {option.emoji && <Emoji emoji={option.emoji} size={18} />}
        <span className="truncate">{option.label}</span>
        {isSelected && (
          <svg
            className="w-4 h-4 ml-auto text-coral flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    );
  }

  const dropdown = isOpen && (
    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
      {/* Search input (hidden in freeform mode since the trigger IS the input) */}
      {!freeform && (
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search\u2026"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-coral/50"
            aria-controls={listboxId}
            aria-activedescendant={
              highlightIndex >= 0
                ? `${listboxId}-opt-${highlightIndex}`
                : undefined
            }
          />
        </div>
      )}

      {/* Options list */}
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        className="max-h-48 overflow-y-auto"
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, i) => renderOption(opt, i))
        ) : (
          <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
            {freeform ? "No matches \u2014 value will be used as-is" : "No matches"}
          </div>
        )}
      </div>
    </div>
  );

  // ---- Main render ----

  if (freeform) {
    return (
      <div ref={containerRef} className="relative">
        {/* Hidden input carries the actual form value */}
        <input type="hidden" name={name} value={value} />

        {/* Visible combobox input */}
        <input
          ref={searchRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightIndex >= 0
              ? `${listboxId}-opt-${highlightIndex}`
              : undefined
          }
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setValue(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            className ||
            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
          }
        />
        {dropdown}
      </div>
    );
  }

  // Select mode (non-freeform)
  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />

      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        className={
          className ||
          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
        }
      >
        {selectedOption ? (
          <>
            {selectedOption.emoji && (
              <Emoji emoji={selectedOption.emoji} size={16} />
            )}
            <span className="truncate">{selectedOption.label}</span>
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 truncate">
            {placeholder}
          </span>
        )}
        {/* Chevron */}
        <svg
          className={`w-4 h-4 ml-auto flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
