import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@/styles/catppuccin.css";

import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { mantineCssResolver, theme } from "@/theme";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import "./i18n";
import { PostHogProvider } from "posthog-js/react";
import {
  getPostHogHost,
  getPostHogKey,
  isCloud,
  isPostHogEnabled,
} from "@/lib/config.ts";
import posthog from "posthog-js";
import {
  applyDocmostTheme,
  DocmostThemeProvider,
  getInitialDocmostTheme,
  getMantineColorScheme,
  persistDocmostTheme,
} from "@/features/user/theme/docmost-theme.tsx";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

if (isCloud() && isPostHogEnabled) {
  posthog.init(getPostHogKey(), {
    api_host: getPostHogHost(),
    defaults: "2025-05-24",
    disable_session_recording: true,
    capture_pageleave: false,
  });
}

const container = document.getElementById("root") as HTMLElement;
const root = ((container as any).__reactRoot ??=
  ReactDOM.createRoot(container));
const initialTheme = getInitialDocmostTheme();

persistDocmostTheme(initialTheme);
applyDocmostTheme(initialTheme);

root.render(
  <BrowserRouter>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={mantineCssResolver}
      defaultColorScheme={getMantineColorScheme(initialTheme)}
    >
      <DocmostThemeProvider initialTheme={initialTheme}>
        <ModalsProvider>
          <QueryClientProvider client={queryClient}>
            <Notifications position="bottom-center" limit={3} zIndex={10000} />
            <HelmetProvider>
              <PostHogProvider client={posthog}>
                <App />
              </PostHogProvider>
            </HelmetProvider>
          </QueryClientProvider>
        </ModalsProvider>
      </DocmostThemeProvider>
    </MantineProvider>
  </BrowserRouter>,
);
