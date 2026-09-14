import { useEffect, useRef } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import {
  notifyWithdrawalCompleted,
  notifyWithdrawalFailed,
  notifyWithdrawalProcessing,
  requestNotificationPermissions,
} from "./useNotifications";

const PENDING_TO_PROCESSING_MS = 12000;   // 12s after creation → "en traitement"
const PROCESSING_TO_DONE_MS   = 45000;   // 45s of processing → "effectué"
const FAIL_CHANCE              = 0.04;   // 4% chance d'échec

export function useWithdrawalTracker() {
  const { data, updateWithdrawalStatus } = useAppData();
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermissions();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();

      for (const w of data.withdrawals) {
        const created = new Date(w.date).getTime();
        const elapsed = now - created;

        if (w.status === "pending" && elapsed >= PENDING_TO_PROCESSING_MS) {
          updateWithdrawalStatus(w.id, "processing");
          await notifyWithdrawalProcessing(w.amount, w.currency, w.method);
        }

        if (w.status === "processing") {
          const processingStart = w.processingStartedAt
            ? new Date(w.processingStartedAt).getTime()
            : created + PENDING_TO_PROCESSING_MS;
          const processingElapsed = now - processingStart;

          if (processingElapsed >= PROCESSING_TO_DONE_MS) {
            const failed = Math.random() < FAIL_CHANCE;
            if (failed) {
              updateWithdrawalStatus(w.id, "failed");
              await notifyWithdrawalFailed(w.amount, w.currency);
            } else {
              updateWithdrawalStatus(w.id, "completed");
              await notifyWithdrawalCompleted(w.amount, w.currency, w.method);
            }
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [data.withdrawals, updateWithdrawalStatus]);
}
