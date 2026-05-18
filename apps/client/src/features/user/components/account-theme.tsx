import { Group, Text, Select } from "@mantine/core";
import {
  isDocmostTheme,
  themeOptions,
  useDocmostTheme,
} from "@/features/user/theme/docmost-theme.tsx";
import { useTranslation } from "react-i18next";

export default function AccountTheme() {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" wrap="nowrap" gap="xl">
      <div>
        <Text size="md">{t("Theme")}</Text>
        <Text size="sm" c="dimmed">
          {t("Choose your preferred color scheme.")}
        </Text>
      </div>

      <ThemeSwitcher />
    </Group>
  );
}

function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useDocmostTheme();

  const handleChange = (value: string | null) => {
    if (isDocmostTheme(value)) {
      setTheme(value);
    }
  };

  return (
    <Select
      label={t("Select theme")}
      data={themeOptions.map((option) => ({
        value: option.value,
        label: option.labelKey ? t(option.labelKey) : option.label,
      }))}
      value={theme}
      onChange={handleChange}
      allowDeselect={false}
      checkIconPosition="right"
    />
  );
}
