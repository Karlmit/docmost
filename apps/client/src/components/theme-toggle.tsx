import { ActionIcon, Tooltip, useComputedColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useDocmostTheme } from "@/features/user/theme/docmost-theme.tsx";
import classes from "./theme-toggle.module.css";

export function ThemeToggle() {
  const { setTheme } = useDocmostTheme();
  const computedColorScheme = useComputedColorScheme();

  return (
    <Tooltip label="Toggle Color Scheme">
      <ActionIcon
        variant="default"
        onClick={() => {
          setTheme(computedColorScheme === "light" ? "dark" : "light");
        }}
        aria-label="Toggle color scheme"
      >
        <IconSun className={classes.light} size={18} stroke={1.5} />
        <IconMoon className={classes.dark} size={18} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}
