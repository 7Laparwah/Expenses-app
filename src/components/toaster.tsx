import { Toaster } from "sonner";
import { useLedger } from "@/lib/store";

export function ThemedToaster() {
  const theme = useLedger((s) => s.settings.theme);
  return (
    <Toaster
      theme={theme}
      position="top-center"
      toastOptions={{
        style: {
          background: "var(--app-surface)",
          color: "var(--app-fg)",
          border: "1px solid var(--app-border)",
        },
      }}
    />
  );
}
