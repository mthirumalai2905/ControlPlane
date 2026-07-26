"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  ready: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: (event?: { clientX: number; clientY: number }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "cp-theme";

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function setRevealOrigin(x: number, y: number) {
  const root = document.documentElement;
  root.style.setProperty("--vt-x", `${x}px`);
  root.style.setProperty("--vt-y", `${y}px`);
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty("--vt-r", `${endRadius}px`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferred =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setThemeState(preferred);
    applyThemeClass(preferred);
    setReady(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeClass(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(
    (event?: { clientX: number; clientY: number }) => {
      const next: Theme = theme === "light" ? "dark" : "light";

      // Always reveal from bottom-left → top-right diagonal elegance
      const originX = event?.clientX ?? 28;
      const originY = event?.clientY ?? window.innerHeight - 28;
      setRevealOrigin(originX, originY);

      const run = () => setTheme(next);

      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> };
      };

      if (
        !doc.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        // Soft delay even without View Transitions
        window.setTimeout(run, 80);
        return;
      }

      // Small elegant beat before the wipe begins
      window.setTimeout(() => {
        const transition = doc.startViewTransition!(run);
        void transition.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at var(--vt-x) var(--vt-y))`,
                `circle(var(--vt-r) at var(--vt-x) var(--vt-y))`,
              ],
            },
            {
              duration: 920,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        });
      }, 120);
    },
    [setTheme, theme],
  );

  const value = useMemo(
    () => ({ theme, ready, setTheme, toggleTheme }),
    [theme, ready, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
