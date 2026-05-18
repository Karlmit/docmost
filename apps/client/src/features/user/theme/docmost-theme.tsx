import { MantineColorScheme, useMantineColorScheme } from "@mantine/core";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const DOCMOST_THEME_STORAGE_KEY = "docmost-theme";
const MANTINE_COLOR_SCHEME_STORAGE_KEY = "mantine-color-scheme-value";

export type CatppuccinTheme =
  | "catppuccin-latte"
  | "catppuccin-frappe"
  | "catppuccin-macchiato"
  | "catppuccin-mocha";

export type DraculaTheme = "dracula";

export type DocmostTheme = MantineColorScheme | CatppuccinTheme | DraculaTheme;

type DocmostThemeContextValue = {
  theme: DocmostTheme;
  setTheme: (theme: DocmostTheme) => void;
};

type ThemeOption = {
  value: DocmostTheme;
  label: string;
  labelKey?: string;
  swatch?: string;
};

const DOCMOST_THEME_VALUES = new Set<DocmostTheme>([
  "light",
  "dark",
  "auto",
  "catppuccin-latte",
  "catppuccin-frappe",
  "catppuccin-macchiato",
  "catppuccin-mocha",
  "dracula",
]);

export const themeOptions: ThemeOption[] = [
  { value: "light", label: "Light", labelKey: "Light" },
  { value: "dark", label: "Dark", labelKey: "Dark" },
  { value: "auto", label: "System settings", labelKey: "System settings" },
  {
    value: "catppuccin-latte",
    label: "Catppuccin Latte",
    swatch: "#1e66f5",
  },
  {
    value: "catppuccin-frappe",
    label: "Catppuccin Frappe",
    swatch: "#8caaee",
  },
  {
    value: "catppuccin-macchiato",
    label: "Catppuccin Macchiato",
    swatch: "#8aadf4",
  },
  {
    value: "catppuccin-mocha",
    label: "Catppuccin Mocha",
    swatch: "#89b4fa",
  },
  {
    value: "dracula",
    label: "Dracula",
    swatch: "#bd93f9",
  },
];

const DocmostThemeContext = createContext<DocmostThemeContextValue | null>(
  null,
);

export function isDocmostTheme(value: string | null): value is DocmostTheme {
  return DOCMOST_THEME_VALUES.has(value as DocmostTheme);
}

export function isCatppuccinTheme(
  value: DocmostTheme,
): value is CatppuccinTheme {
  return value.startsWith("catppuccin-");
}

export function isPaletteTheme(value: DocmostTheme) {
  return isCatppuccinTheme(value) || value === "dracula";
}

export function getMantineColorScheme(theme: DocmostTheme): MantineColorScheme {
  if (theme === "catppuccin-latte") {
    return "light";
  }

  if (isPaletteTheme(theme)) {
    return "dark";
  }

  return theme;
}

export function applyDocmostTheme(theme: DocmostTheme) {
  if (typeof document === "undefined") {
    return;
  }

  if (isPaletteTheme(theme)) {
    document.documentElement.dataset.docmostTheme = theme;
    return;
  }

  delete document.documentElement.dataset.docmostTheme;
}

export function getInitialDocmostTheme(): DocmostTheme {
  if (typeof localStorage === "undefined") {
    return "auto";
  }

  const storedTheme = localStorage.getItem(DOCMOST_THEME_STORAGE_KEY);
  if (isDocmostTheme(storedTheme)) {
    return storedTheme;
  }

  const storedColorScheme = localStorage.getItem(
    MANTINE_COLOR_SCHEME_STORAGE_KEY,
  );

  if (isDocmostTheme(storedColorScheme)) {
    return storedColorScheme;
  }

  return "auto";
}

export function persistDocmostTheme(theme: DocmostTheme) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(DOCMOST_THEME_STORAGE_KEY, theme);
  localStorage.setItem(
    MANTINE_COLOR_SCHEME_STORAGE_KEY,
    getMantineColorScheme(theme),
  );
}

export function DocmostThemeProvider({
  children,
  initialTheme = getInitialDocmostTheme(),
}: {
  children: ReactNode;
  initialTheme?: DocmostTheme;
}) {
  const { setColorScheme } = useMantineColorScheme();
  const [theme, setThemeState] = useState<DocmostTheme>(initialTheme);

  useEffect(() => {
    persistDocmostTheme(theme);
    applyDocmostTheme(theme);
    setColorScheme(getMantineColorScheme(theme));
  }, [setColorScheme, theme]);

  const setTheme = useCallback((nextTheme: DocmostTheme) => {
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [setTheme, theme],
  );

  return (
    <DocmostThemeContext.Provider value={value}>
      {children}
    </DocmostThemeContext.Provider>
  );
}

export function useDocmostTheme() {
  const context = useContext(DocmostThemeContext);

  if (!context) {
    throw new Error("useDocmostTheme must be used within DocmostThemeProvider");
  }

  return context;
}
