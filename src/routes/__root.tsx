import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppFrame, BottomNav } from "@/components/shell";
import { PinLock } from "@/components/pin-lock";
import { ThemedToaster } from "@/components/toaster";
import appCss from "../styles.css?url";

const APP_NAME = "Khata";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#07080C" },
      { name: "description", content: "Khata — a gold-accented ledger for payments, goals, and voice entries." },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <AppFrame>
            <Outlet />
            <BottomNav />
            <PinLock />
          </AppFrame>
          <ThemedToaster />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
