import { ReplitConnectors } from "@replit/connectors-sdk";

export function getRevenueCatConnector() {
  const connectors = new ReplitConnectors();

  return {
    async request<T>(
      path: string,
      init?: { method?: string; body?: unknown },
    ): Promise<T> {
      const response = await connectors.proxy("revenuecat", path, {
        method: init?.method ?? "GET",
        body: init?.body,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          `RevenueCat ${init?.method ?? "GET"} ${path} failed: ${response.status} ${JSON.stringify(payload)}`,
        );
      }

      return payload as T;
    },
  };
}

export type RevenueCatList<T> = {
  items?: T[];
  next_page?: string | null;
};