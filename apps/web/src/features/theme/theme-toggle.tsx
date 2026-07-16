import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-context";

/** Schneller Hell/Dunkel-Umschalter für die Kopfzeile. */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const istDunkel = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={istDunkel ? "Zum hellen Design wechseln" : "Zum dunklen Design wechseln"}
      title={istDunkel ? "Helles Design" : "Dunkles Design"}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {istDunkel ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
