import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowRight,
  IconArrowsHorizontal,
  IconCheck,
  IconDots,
  IconEye,
  IconEyeOff,
  IconFileExport,
  IconHistory,
  IconLink,
  IconList,
  IconMarkdown,
  IconMessage,
  IconPrinter,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconWifiOff,
} from "@tabler/icons-react";
import React, { useEffect, useRef, useState } from "react";
import useToggleAside from "@/hooks/use-toggle-aside.tsx";
import { useAtom, useAtomValue } from "jotai";
import { historyAtoms } from "@/features/page-history/atoms/history-atoms.ts";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { useClipboard } from "@/hooks/use-clipboard";
import { useParams } from "react-router-dom";
import { usePageQuery } from "@/features/page/queries/page-query.ts";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { notifications } from "@mantine/notifications";
import { getAppUrl } from "@/lib/config.ts";
import { extractPageSlugId } from "@/lib";
import { useTreeMutation } from "@/features/page/tree/hooks/use-tree-mutation.ts";
import { useDeletePageModal } from "@/features/page/hooks/use-delete-page-modal.tsx";
import { PageWidthToggle } from "@/features/user/components/page-width-pref.tsx";
import { Trans, useTranslation } from "react-i18next";
import ExportModal from "@/components/common/export-modal";
import { htmlToMarkdown } from "@docmost/editor-ext";
import {
  pageEditorAtom,
  yjsConnectionStatusAtom,
} from "@/features/editor/atoms/editor-atoms.ts";
import { formattedDate } from "@/lib/time.ts";
import { PageEditModeToggle } from "@/features/user/components/page-state-pref.tsx";
import MovePageModal from "@/features/page/components/move-page-modal.tsx";
import { useTimeAgo } from "@/hooks/use-time-ago.tsx";
import { PageShareModal } from "@/ee/page-permission";
import {
  PageVerificationMenuItem,
  PageVerificationModal,
} from "@/ee/page-verification";
import {
  useFavoriteIds,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "@/features/favorite/queries/favorite-query";
import {
  useWatchStatusQuery,
  useWatchPageMutation,
  useUnwatchPageMutation,
} from "@/features/page/queries/watcher-query";

interface PageHeaderMenuProps {
  readOnly?: boolean;
}
export default function PageHeaderMenu({ readOnly }: PageHeaderMenuProps) {
  const { t } = useTranslation();
  const toggleAside = useToggleAside();
  const { pageSlug } = useParams();
  const { data: page } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });
  const isDeleted = !!page?.deletedAt;

  useHotkeys(
    [
      [
        "mod+F",
        () => {
          const event = new CustomEvent("openFindDialogFromEditor", {});
          document.dispatchEvent(event);
        },
      ],
      [
        "Escape",
        () => {
          const event = new CustomEvent("closeFindDialogFromEditor", {});
          document.dispatchEvent(event);
        },
        { preventDefault: false },
      ],
    ],
    [],
  );

  if (isDeleted) {
    return null;
  }

  return (
    <>
      <ConnectionWarning />

      {!readOnly && <PageEditModeToggle size="xs" />}

      <PageShareModal readOnly={readOnly} />

      <Tooltip label={t("Comments")} openDelay={250} withArrow>
        <ActionIcon
          variant="subtle"
          color="dark"
          aria-label={t("Comments")}
          onClick={() => toggleAside("comments")}
        >
          <IconMessage size={20} stroke={2} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={t("Table of contents")} openDelay={250} withArrow>
        <ActionIcon
          variant="subtle"
          color="dark"
          aria-label={t("Table of contents")}
          onClick={() => toggleAside("toc")}
        >
          <IconList size={20} stroke={2} />
        </ActionIcon>
      </Tooltip>

      <PageActionMenu readOnly={readOnly} />
    </>
  );
}

interface PageActionMenuProps {
  readOnly?: boolean;
}

type PrintPdfTheme =
  | "plain"
  | "polished-print"
  | "current"
  | "catppuccin-latte"
  | "catppuccin-frappe"
  | "catppuccin-macchiato"
  | "catppuccin-mocha"
  | "dracula";

const PRINT_PDF_THEME_STORAGE_KEY = "docmost.printPdf.theme";

type PrintPdfThemeColors = {
  text: string;
  pageBg: string;
  heading: string;
  headingAlt: string;
  link: string;
  quoteText: string;
  quoteBorder: string;
  strong: string;
  emphasis: string;
  codeText: string;
  codeBg: string;
  rule: string;
  listMarker: string;
};

const PRINT_PDF_THEMES: Array<{
  label: string;
  value: PrintPdfTheme;
  description: string;
  swatch: string;
  colors?: PrintPdfThemeColors;
}> = [
  {
    label: "Plain black",
    value: "plain",
    description: "High-contrast text",
    swatch: "#000000",
    colors: {
      text: "#000000",
      pageBg: "#ffffff",
      heading: "#000000",
      headingAlt: "#000000",
      link: "#000000",
      quoteText: "#000000",
      quoteBorder: "#000000",
      strong: "#000000",
      emphasis: "#000000",
      codeText: "#000000",
      codeBg: "#f3f4f6",
      rule: "#000000",
      listMarker: "#000000",
    },
  },
  {
    label: "Polished print",
    value: "polished-print",
    description: "Color on white paper",
    swatch: "#4f46e5",
    colors: {
      text: "#1f2937",
      pageBg: "#ffffff",
      heading: "#4f46e5",
      headingAlt: "#7c3aed",
      link: "#0f6ea8",
      quoteText: "#7c2d12",
      quoteBorder: "#f97316",
      strong: "#9a3412",
      emphasis: "#be123c",
      codeText: "#047857",
      codeBg: "#f3f4f6",
      rule: "#94a3b8",
      listMarker: "#7c3aed",
    },
  },
  {
    label: "Current theme",
    value: "current",
    description: "Match editor colors",
    swatch: "#8caaee",
  },
  {
    label: "Catppuccin Latte",
    value: "catppuccin-latte",
    description: "Light palette",
    swatch: "#1e66f5",
    colors: {
      text: "#4c4f69",
      pageBg: "#ffffff",
      heading: "#7287fd",
      headingAlt: "#8839ef",
      link: "#1e66f5",
      quoteText: "#dc8a78",
      quoteBorder: "#7287fd",
      strong: "#fe640b",
      emphasis: "#dc8a78",
      codeText: "#40a02b",
      codeBg: "#f3f4f6",
      rule: "#7287fd",
      listMarker: "#8839ef",
    },
  },
  {
    label: "Catppuccin Frappe",
    value: "catppuccin-frappe",
    description: "Paper-adapted palette",
    swatch: "#8caaee",
    colors: {
      text: "#303446",
      pageBg: "#ffffff",
      heading: "#5b5fc7",
      headingAlt: "#8839ad",
      link: "#2563ad",
      quoteText: "#8f4d41",
      quoteBorder: "#5b5fc7",
      strong: "#9a4d1f",
      emphasis: "#8f4d41",
      codeText: "#3a6f2a",
      codeBg: "#f1f3f9",
      rule: "#a9aed8",
      listMarker: "#8839ad",
    },
  },
  {
    label: "Catppuccin Macchiato",
    value: "catppuccin-macchiato",
    description: "Paper-adapted palette",
    swatch: "#8aadf4",
    colors: {
      text: "#24273a",
      pageBg: "#ffffff",
      heading: "#5357bf",
      headingAlt: "#7c3bb2",
      link: "#1d5ea8",
      quoteText: "#8d4b43",
      quoteBorder: "#5357bf",
      strong: "#9d4b24",
      emphasis: "#8d4b43",
      codeText: "#34712f",
      codeBg: "#f0f2f8",
      rule: "#a4a9d8",
      listMarker: "#7c3bb2",
    },
  },
  {
    label: "Catppuccin Mocha",
    value: "catppuccin-mocha",
    description: "Paper-adapted palette",
    swatch: "#89b4fa",
    colors: {
      text: "#1e1e2e",
      pageBg: "#ffffff",
      heading: "#515bc9",
      headingAlt: "#7f3fb2",
      link: "#1e63ad",
      quoteText: "#8f4b43",
      quoteBorder: "#515bc9",
      strong: "#9f4f2b",
      emphasis: "#8f4b43",
      codeText: "#2f742c",
      codeBg: "#f0f1f7",
      rule: "#9ea6d8",
      listMarker: "#7f3fb2",
    },
  },
  {
    label: "Dracula",
    value: "dracula",
    description: "Paper-adapted palette",
    swatch: "#bd93f9",
    colors: {
      text: "#282a36",
      pageBg: "#ffffff",
      heading: "#6b3fb2",
      headingAlt: "#08708a",
      link: "#08708a",
      quoteText: "#8a6500",
      quoteBorder: "#6b3fb2",
      strong: "#9a4b00",
      emphasis: "#9c1f68",
      codeText: "#1f7a3d",
      codeBg: "#f3f3f6",
      rule: "#6272a4",
      listMarker: "#9c1f68",
    },
  },
];

function isPrintPdfTheme(value: string | null): value is PrintPdfTheme {
  return PRINT_PDF_THEMES.some((theme) => theme.value === value);
}

function getPrintPdfTheme(value: PrintPdfTheme) {
  return (
    PRINT_PDF_THEMES.find((theme) => theme.value === value) ??
    PRINT_PDF_THEMES[0]
  );
}

function applyPrintPdfTheme(theme: PrintPdfTheme) {
  document.documentElement.dataset.docmostPrintTheme = theme;

  const colors = getPrintPdfTheme(theme).colors;
  if (!colors) {
    clearPrintPdfThemeVariables();
    document.documentElement.dataset.docmostPrintTheme = theme;
    return;
  }

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--docmost-md-text", colors.text);
  rootStyle.setProperty("--docmost-md-page-bg", colors.pageBg);
  rootStyle.setProperty("--docmost-md-heading", colors.heading);
  rootStyle.setProperty("--docmost-md-heading-alt", colors.headingAlt);
  rootStyle.setProperty("--docmost-md-link", colors.link);
  rootStyle.setProperty("--docmost-md-quote-text", colors.quoteText);
  rootStyle.setProperty("--docmost-md-quote-border", colors.quoteBorder);
  rootStyle.setProperty("--docmost-md-strong", colors.strong);
  rootStyle.setProperty("--docmost-md-emphasis", colors.emphasis);
  rootStyle.setProperty("--docmost-md-code-text", colors.codeText);
  rootStyle.setProperty("--docmost-md-code-bg", colors.codeBg);
  rootStyle.setProperty("--docmost-md-rule", colors.rule);
  rootStyle.setProperty("--docmost-md-list-marker", colors.listMarker);
}

function clearPrintPdfThemeVariables() {
  const rootStyle = document.documentElement.style;
  [
    "--docmost-md-text",
    "--docmost-md-page-bg",
    "--docmost-md-heading",
    "--docmost-md-heading-alt",
    "--docmost-md-link",
    "--docmost-md-quote-text",
    "--docmost-md-quote-border",
    "--docmost-md-strong",
    "--docmost-md-emphasis",
    "--docmost-md-code-text",
    "--docmost-md-code-bg",
    "--docmost-md-rule",
    "--docmost-md-list-marker",
  ].forEach((property) => rootStyle.removeProperty(property));
}

function clearPrintPdfTheme() {
  delete document.documentElement.dataset.docmostPrintTheme;
  clearPrintPdfThemeVariables();
}

function PageActionMenu({ readOnly }: PageActionMenuProps) {
  const { t } = useTranslation();
  const [, setHistoryModalOpen] = useAtom(historyAtoms);
  const clipboard = useClipboard({ timeout: 500 });
  const { pageSlug, spaceSlug } = useParams();
  const { data: page, isLoading } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });
  const { openDeleteModal } = useDeletePageModal();
  const { handleDelete } = useTreeMutation(page?.spaceId ?? "");
  const [exportOpened, { open: openExportModal, close: closeExportModal }] =
    useDisclosure(false);
  const [
    movePageModalOpened,
    { open: openMovePageModal, close: closeMoveSpaceModal },
  ] = useDisclosure(false);
  const [
    verificationOpened,
    { open: openVerificationModal, close: closeVerificationModal },
  ] = useDisclosure(false);
  const [
    printSettingsOpened,
    { open: openPrintSettingsModal, close: closePrintSettingsModal },
  ] = useDisclosure(false);
  const [printPdfTheme, setPrintPdfTheme] = useState<PrintPdfTheme>("plain");
  const [pageEditor] = useAtom(pageEditorAtom);
  const pageUpdatedAt = useTimeAgo(page?.updatedAt);
  const favoriteIds = useFavoriteIds("page", page?.spaceId);
  const addFavoriteMutation = useAddFavoriteMutation();
  const removeFavoriteMutation = useRemoveFavoriteMutation();
  const isFavorited = page?.id ? favoriteIds.has(page.id) : false;
  const { data: watchStatus } = useWatchStatusQuery(page?.id);
  const watchPage = useWatchPageMutation();
  const unwatchPage = useUnwatchPageMutation();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(
      PRINT_PDF_THEME_STORAGE_KEY,
    );
    const nextTheme = isPrintPdfTheme(storedTheme) ? storedTheme : "plain";

    setPrintPdfTheme(nextTheme);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        clearPrintPdfTheme();
      }
    };
  }, []);

  const handleCopyLink = () => {
    const pageUrl =
      getAppUrl() + buildPageUrl(spaceSlug, page.slugId, page.title);

    clipboard.copy(pageUrl);
    notifications.show({ message: t("Link copied") });
  };

  const handleCopyAsMarkdown = () => {
    if (!pageEditor) return;
    const html = pageEditor.getHTML();
    const markdown = htmlToMarkdown(html);
    const title = page?.title ? `# ${page.title}\n\n` : "";
    clipboard.copy(`${title}${markdown}`);
    notifications.show({ message: t("Copied") });
  };

  const handlePrint = (theme = printPdfTheme) => {
    applyPrintPdfTheme(theme);
    window.localStorage.setItem(PRINT_PDF_THEME_STORAGE_KEY, theme);
    setPrintPdfTheme(theme);
    closePrintSettingsModal();
    window.addEventListener("afterprint", clearPrintPdfTheme, { once: true });

    setTimeout(() => {
      window.print();
    }, 250);
  };

  const openHistoryModal = () => {
    setHistoryModalOpen(true);
  };

  const handleDeletePage = () => {
    openDeleteModal({ onConfirm: () => handleDelete(page.id) });
  };

  const handleToggleFavorite = () => {
    if (!page?.id) return;
    const params = { type: "page" as const, pageId: page.id };
    if (isFavorited) {
      removeFavoriteMutation.mutate(params);
    } else {
      addFavoriteMutation.mutate(params);
    }
  };

  const selectedPrintTheme = getPrintPdfTheme(printPdfTheme);
  const previewColors = selectedPrintTheme.colors ?? {
    text: "var(--docmost-md-text)",
    pageBg: "#ffffff",
    heading: "var(--docmost-md-heading)",
    headingAlt: "var(--docmost-md-heading-alt)",
    link: "var(--docmost-md-link)",
    quoteText: "var(--docmost-md-quote-text)",
    quoteBorder: "var(--docmost-md-quote-border)",
    strong: "var(--docmost-md-strong)",
    emphasis: "var(--docmost-md-emphasis)",
    codeText: "var(--docmost-md-code-text)",
    codeBg: "#f3f4f6",
    rule: "var(--docmost-md-rule)",
    listMarker: "var(--docmost-md-list-marker)",
  };

  return (
    <>
      <Menu
        shadow="xl"
        position="bottom-end"
        offset={20}
        width={230}
        withArrow
        arrowPosition="center"
      >
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="dark"
            aria-label={t("Page actions")}
          >
            <IconDots size={20} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconLink size={16} />}
            onClick={handleCopyLink}
          >
            {t("Copy link")}
          </Menu.Item>

          <Menu.Item
            leftSection={<IconMarkdown size={16} />}
            onClick={handleCopyAsMarkdown}
          >
            {t("Copy as Markdown")}
          </Menu.Item>

          <Menu.Item
            leftSection={
              isFavorited ? (
                <IconStarFilled size={16} color="var(--mantine-color-yellow-5)" />
              ) : (
                <IconStar size={16} />
              )
            }
            onClick={handleToggleFavorite}
          >
            {isFavorited ? t("Remove from favorites") : t("Add to favorites")}
          </Menu.Item>

          {watchStatus?.watching ? (
            <Menu.Item
              leftSection={<IconEyeOff size={16} />}
              onClick={() => unwatchPage.mutate(page.id)}
            >
              {t("Stop watching")}
            </Menu.Item>
          ) : (
            <Menu.Item
              leftSection={<IconEye size={16} />}
              onClick={() => watchPage.mutate(page.id)}
            >
              {t("Watch page")}
            </Menu.Item>
          )}

          <Menu.Divider />

          <Menu.Item leftSection={<IconArrowsHorizontal size={16} />}>
            <Group wrap="nowrap">
              <PageWidthToggle label={t("Full width")} />
            </Group>
          </Menu.Item>

          <Menu.Item
            leftSection={<IconHistory size={16} />}
            onClick={openHistoryModal}
          >
            {t("Page history")}
          </Menu.Item>

          {!readOnly && (
            <PageVerificationMenuItem
              pageId={page?.id}
              onClick={openVerificationModal}
            />
          )}

          <Menu.Divider />

          {!readOnly && (
            <Menu.Item
              leftSection={<IconArrowRight size={16} />}
              onClick={openMovePageModal}
            >
              {t("Move")}
            </Menu.Item>
          )}

          <Menu.Item
            leftSection={<IconFileExport size={16} />}
            onClick={openExportModal}
          >
            {t("Export")}
          </Menu.Item>

          <Menu.Item
            leftSection={<IconPrinter size={16} />}
            onClick={openPrintSettingsModal}
          >
            {t("Print PDF")}
          </Menu.Item>

          {!readOnly && (
            <>
              <Menu.Divider />
              <Menu.Item
                color={"red"}
                leftSection={<IconTrash size={16} />}
                onClick={handleDeletePage}
              >
                {t("Move to trash")}
              </Menu.Item>
            </>
          )}

          <Menu.Divider />

          <>
            <Group px="sm" wrap="nowrap" style={{ cursor: "pointer" }}>
              <Tooltip
                label={t("Edited by {{name}} {{time}}", {
                  name: page.lastUpdatedBy.name,
                  time: pageUpdatedAt,
                })}
                position="left-start"
              >
                <div style={{ width: 210 }}>
                  <Text size="xs" c="dimmed" truncate="end">
                    {t("Word count: {{wordCount}}", {
                      wordCount: pageEditor?.storage?.characterCount?.words(),
                    })}
                  </Text>

                  <Text size="xs" c="dimmed" lineClamp={1}>
                    <Trans
                      defaults="Created by: <b>{{creatorName}}</b>"
                      values={{ creatorName: page?.creator?.name }}
                      components={{ b: <Text span fw={500} /> }}
                    />
                  </Text>
                  <Text size="xs" c="dimmed" truncate="end">
                    {t("Created at: {{time}}", {
                      time: formattedDate(page.createdAt),
                    })}
                  </Text>
                </div>
              </Tooltip>
            </Group>
          </>
        </Menu.Dropdown>
      </Menu>

      <ExportModal
        type="page"
        id={page.id}
        open={exportOpened}
        onClose={closeExportModal}
      />

      <MovePageModal
        pageId={page.id}
        slugId={page.slugId}
        currentSpaceSlug={spaceSlug}
        onClose={closeMoveSpaceModal}
        open={movePageModalOpened}
      />

      <PageVerificationModal
        pageId={page.id}
        opened={verificationOpened}
        onClose={closeVerificationModal}
      />

      <Modal
        opened={printSettingsOpened}
        onClose={closePrintSettingsModal}
        title={t("Print PDF settings")}
        centered
        size="xl"
      >
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "var(--mantine-spacing-lg)",
            alignItems: "start",
          }}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t("Choose how markdown colors are applied when printing this page.")}
            </Text>

            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
              {PRINT_PDF_THEMES.map((printTheme) => {
                const selected = printPdfTheme === printTheme.value;

                return (
                  <UnstyledButton
                    key={printTheme.value}
                    onClick={() => setPrintPdfTheme(printTheme.value)}
                    aria-label={t("Use {{label}} print theme", {
                      label: printTheme.label,
                    })}
                    style={{
                      border: selected
                        ? "1px solid var(--mantine-primary-color-filled)"
                        : "1px solid var(--mantine-color-default-border)",
                      borderRadius: 8,
                      padding: "var(--mantine-spacing-sm)",
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: printTheme.swatch,
                          border: "1px solid var(--mantine-color-default-border)",
                          flexShrink: 0,
                        }}
                      />
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" fw={500}>
                          {printTheme.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {printTheme.description}
                        </Text>
                      </Box>
                      {selected && <IconCheck size={16} />}
                    </Group>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>

            <Group justify="flex-end">
              <Button variant="default" onClick={closePrintSettingsModal}>
                {t("Cancel")}
              </Button>
              <Button
                leftSection={<IconPrinter size={16} />}
                onClick={() => handlePrint()}
              >
                {t("Print PDF")}
              </Button>
            </Group>
          </Stack>

          <Box
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: 8,
              padding: "var(--mantine-spacing-md)",
              background: "var(--mantine-color-body)",
            }}
          >
            <Text size="sm" fw={600} mb="xs">
              {selectedPrintTheme.label}
            </Text>
            <Box
              style={{
                minHeight: 430,
                background: previewColors.pageBg,
                color: previewColors.text,
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: 4,
                padding: "28px 30px",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <Text
                fw={700}
                style={{ color: previewColors.heading, fontSize: 26, lineHeight: 1.15 }}
              >
                Ticket Writing Standards
              </Text>
              <Box
                style={{
                  height: 1,
                  background: previewColors.rule,
                  margin: "14px 0 16px",
                }}
              />
              <Text style={{ color: previewColors.text }}>
                Good ticket documentation helps with:
              </Text>
              <Box component="ul" mt={8} mb={18} pl={22}>
                {[
                  "Handover between technicians",
                  "Faster troubleshooting",
                  "Better user communication",
                ].map((item) => (
                  <Box
                    component="li"
                    key={item}
                    style={{ color: previewColors.text }}
                  >
                    <span style={{ color: previewColors.listMarker }}>{item}</span>
                  </Box>
                ))}
              </Box>
              <Text
                fw={700}
                style={{ color: previewColors.headingAlt, fontSize: 18 }}
              >
                Discussion Questions
              </Text>
              <Text mt={8} style={{ color: previewColors.text }}>
                What should every <strong style={{ color: previewColors.strong }}>ticket</strong>{" "}
                include before it is closed?
              </Text>
              <Box
                mt={14}
                mb={14}
                pl={14}
                style={{
                  borderLeft: `3px solid ${previewColors.quoteBorder}`,
                  color: previewColors.quoteText,
                }}
              >
                <Text fs="italic" style={{ color: previewColors.quoteText }}>
                  Write the update so the next person understands the decision,
                  the action, and the result.
                </Text>
              </Box>
              <Text style={{ color: previewColors.text }}>
                See the{" "}
                <span style={{ color: previewColors.link, fontWeight: 600 }}>
                  escalation checklist
                </span>{" "}
                and mark unknowns as{" "}
                <span
                  style={{
                    color: previewColors.codeText,
                    background: previewColors.codeBg,
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontFamily: "monospace",
                  }}
                >
                  pending
                </span>
                .
              </Text>
              <Text mt={16} fs="italic" style={{ color: previewColors.emphasis }}>
                Short, human notes are easier to trust.
              </Text>
            </Box>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

function ConnectionWarning() {
  const { t } = useTranslation();
  const yjsConnectionStatus = useAtomValue(yjsConnectionStatusAtom);
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isDisconnected = ["disconnected", "connecting"].includes(
      yjsConnectionStatus,
    );

    if (isDisconnected) {
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => setShowWarning(true), 5000);
      }
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setShowWarning(false);
    }
  }, [yjsConnectionStatus]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!showWarning) return null;

  return (
    <Tooltip
      label={t("Real-time editor connection lost. Retrying...")}
      openDelay={250}
      withArrow
    >
      <ThemeIcon
        variant="default"
        c="red"
        role="status"
        aria-label={t("Real-time editor connection lost. Retrying...")}
        style={{ border: "none" }}
      >
        <IconWifiOff size={20} stroke={2} />
      </ThemeIcon>
    </Tooltip>
  );
}
