import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Zeigt einen Eintrag zum Zurücksetzen der Auswahl. */
  emptyOption?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Durchsuchbares Auswahlfeld (Combobox) als Ersatz für lange Dropdowns. Ohne
 * zusätzliche Abhängigkeiten: Trigger-Button + Panel mit Suchfeld und
 * gefilterter, per Tastatur navigierbarer Liste. Schließt bei Klick nach außen
 * und bei Escape.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Bitte wählen…",
  emptyOption,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const gefiltert = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return base;
  }, [options, query]);

  // Liste inkl. optionalem Leer-Eintrag (Wert "").
  const eintraege: ComboboxOption[] = useMemo(
    () => (emptyOption ? [{ value: "", label: emptyOption }, ...gefiltert] : gefiltert),
    [emptyOption, gefiltert],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      // Fokus ins Suchfeld nach dem Öffnen.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, eintraege.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = eintraege[highlight];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Suchen…"
              className="h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {eintraege.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Kein Treffer.</li>
            )}
            {eintraege.map((opt, index) => (
              <li key={opt.value || "__empty__"}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm",
                    index === highlight ? "bg-accent text-accent-foreground" : "",
                    !opt.value && "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value && opt.value === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
