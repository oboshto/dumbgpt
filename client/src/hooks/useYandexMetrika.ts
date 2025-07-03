import { useCallback } from "react";

interface YandexMetrikaHook {
  sendPageview: (url?: string) => void;
  sendEvent: (action: string, params?: Record<string, any>) => void;
  sendGoal: (goalId: string, params?: Record<string, any>) => void;
}

export const useYandexMetrika = (): YandexMetrikaHook => {
  const metrikaId = import.meta.env.VITE_YANDEX_METRIKA_ID;

  const sendPageview = useCallback(
    (url?: string) => {
      if (!metrikaId || import.meta.env.DEV) return;

      const numericId = parseInt(metrikaId, 10);
      if (isNaN(numericId)) return;

      if (window.ym && typeof window.ym === "function") {
        const targetUrl = url || window.location.href;
        window.ym(numericId, "hit", targetUrl);
        console.log("Yandex Metrika: Pageview sent for", targetUrl);
      }
    },
    [metrikaId]
  );

  const sendEvent = useCallback(
    (action: string, params?: Record<string, any>) => {
      if (!metrikaId || import.meta.env.DEV) return;

      const numericId = parseInt(metrikaId, 10);
      if (isNaN(numericId)) return;

      if (window.ym && typeof window.ym === "function") {
        window.ym(numericId, "reachGoal", action);
        console.log("Yandex Metrika: Event sent", action, params);
      }
    },
    [metrikaId]
  );

  const sendGoal = useCallback(
    (goalId: string, params?: Record<string, any>) => {
      if (!metrikaId || import.meta.env.DEV) return;

      const numericId = parseInt(metrikaId, 10);
      if (isNaN(numericId)) return;

      if (window.ym && typeof window.ym === "function") {
        window.ym(numericId, "reachGoal", goalId);
        console.log("Yandex Metrika: Goal sent", goalId, params);
      }
    },
    [metrikaId]
  );

  return {
    sendPageview,
    sendEvent,
    sendGoal,
  };
};
