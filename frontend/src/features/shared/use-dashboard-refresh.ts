import { useEffect, useRef } from "react";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Reuse existing panel refreshes without interrupting dialogs or overlapping requests. */
export function useDashboardRefresh(
  refresh: () => Promise<unknown>,
  enabled: boolean,
  busy: boolean,
) {
  const latest = useRef({ refresh, busy });
  useEffect(() => {
    latest.current = { refresh, busy };
  }, [refresh, busy]);

  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const timer = window.setInterval(async () => {
      if (
        running ||
        latest.current.busy ||
        document.querySelector('[role="dialog"], [role="alertdialog"]') ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      running = true;
      try {
        await latest.current.refresh();
      } catch {
        // Existing query error states and Retry actions provide feedback.
      } finally {
        running = false;
      }
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);
}
