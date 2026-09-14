import { getRevenueCatConnector, type RevenueCatList } from "./revenueCatClient";

type Project = { id: string; name: string };
type App = { id: string; name: string; type: string };
type Product = { id: string; app_id: string; store_identifier: string };
type Entitlement = { id: string; lookup_key: string };
type Offering = { id: string; lookup_key: string; is_current?: boolean };
type Package = { id: string; lookup_key: string };
type PublicApiKey = { key: string };

const PROJECT_NAME = "WealthAI";
const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID;
const APP_BUNDLE_ID = "com.wealthai.app";
const PRODUCT_IDENTIFIER = "wealthai_premium_monthly";
const PLAY_PRODUCT_IDENTIFIER = `${PRODUCT_IDENTIFIER}:monthly`;
const ENTITLEMENT_KEY = "wealthai_premium";
const OFFERING_KEY = "default";
const PACKAGE_KEY = "$rc_monthly";

async function findOrCreate<T extends { id: string }>(
  listPath: string,
  createPath: string,
  matches: (item: T) => boolean,
  body: unknown,
): Promise<T> {
  const api = getRevenueCatConnector();
  const existing = await api.request<RevenueCatList<T>>(listPath);
  const found = existing.items?.find(matches);
  if (found) return found;
  return api.request<T>(createPath, { method: "POST", body });
}

async function main() {
  const api = getRevenueCatConnector();
  const projects = await api.request<RevenueCatList<Project>>("/v2/projects?limit=100");
  const project =
    (PROJECT_ID && projects.items?.find((item) => item.id === PROJECT_ID)) ||
    projects.items?.find((item) => item.name === PROJECT_NAME);

  if (!project) {
    throw new Error(
      "A RevenueCat project is required. Create one in RevenueCat, then set REVENUECAT_PROJECT_ID.",
    );
  }

  const apps = await api.request<RevenueCatList<App>>(
    `/v2/projects/${project.id}/apps?limit=100`,
  );
  const ensureApp = async (
    name: string,
    type: "test_store" | "app_store" | "play_store",
  ) => {
    const found = apps.items?.find((item) => item.type === type);
    if (found) return found;

    const storeConfig =
      type === "app_store"
        ? { app_store: { bundle_id: APP_BUNDLE_ID } }
        : type === "play_store"
          ? { play_store: { package_name: APP_BUNDLE_ID } }
          : {};

    return api.request<App>(`/v2/projects/${project.id}/apps`, {
      method: "POST",
      body: { name, type, ...storeConfig },
    });
  };

  const testApp = await ensureApp("WealthAI Test Store", "test_store");
  const appStoreApp = await ensureApp("WealthAI iOS", "app_store");
  const playStoreApp = await ensureApp("WealthAI Android", "play_store");

  const products = await api.request<RevenueCatList<Product>>(
    `/v2/projects/${project.id}/products?limit=100`,
  );
  const ensureProduct = async (
    app: App,
    storeIdentifier: string,
    displayName: string,
    isTestStore: boolean,
  ) => {
    const found = products.items?.find(
      (item) =>
        item.app_id === app.id && item.store_identifier === storeIdentifier,
    );
    if (found) return found;

    return api.request<Product>(`/v2/projects/${project.id}/products`, {
      method: "POST",
      body: {
        app_id: app.id,
        store_identifier: storeIdentifier,
        type: "subscription",
        display_name: displayName,
        ...(isTestStore
          ? {
              title: displayName,
              subscription: { duration: "P1M" },
            }
          : {}),
      },
    });
  };

  const testProduct = await ensureProduct(
    testApp,
    PRODUCT_IDENTIFIER,
    "WealthAI Premium mensuel",
    true,
  );
  const iosProduct = await ensureProduct(
    appStoreApp,
    PRODUCT_IDENTIFIER,
    "WealthAI Premium mensuel",
    false,
  );
  const androidProduct = await ensureProduct(
    playStoreApp,
    PLAY_PRODUCT_IDENTIFIER,
    "WealthAI Premium mensuel",
    false,
  );

  try {
    await api.request(
      `/v2/projects/${project.id}/products/${testProduct.id}/test_store_prices`,
      {
        method: "POST",
        body: {
          prices: [
            { amount_micros: 4990000, currency: "EUR" },
            { amount_micros: 4990000, currency: "USD" },
          ],
        },
      },
    );
  } catch (error) {
    if (!String(error).includes("resource_already_exists")) throw error;
  }

  const entitlements = await api.request<RevenueCatList<Entitlement>>(
    `/v2/projects/${project.id}/entitlements?limit=100`,
  );
  const entitlement =
    entitlements.items?.find((item) => item.lookup_key === ENTITLEMENT_KEY) ||
    (await api.request<Entitlement>(
      `/v2/projects/${project.id}/entitlements`,
      {
        method: "POST",
        body: {
          lookup_key: ENTITLEMENT_KEY,
          display_name: "Accès WealthAI Premium",
        },
      },
    ));

  try {
    await api.request(
      `/v2/projects/${project.id}/entitlements/${entitlement.id}/actions/attach_products`,
      {
        method: "POST",
        body: {
          product_ids: [testProduct.id, iosProduct.id, androidProduct.id],
        },
      },
    );
  } catch (error) {
    if (!String(error).includes("unprocessable_entity")) throw error;
  }

  const offerings = await api.request<RevenueCatList<Offering>>(
    `/v2/projects/${project.id}/offerings?limit=100`,
  );
  const offering =
    offerings.items?.find((item) => item.lookup_key === OFFERING_KEY) ||
    (await api.request<Offering>(`/v2/projects/${project.id}/offerings`, {
      method: "POST",
      body: { lookup_key: OFFERING_KEY, display_name: "WealthAI Premium" },
    }));

  if (!offering.is_current) {
    await api.request(
      `/v2/projects/${project.id}/offerings/${offering.id}`,
      { method: "PATCH", body: { is_current: true } },
    );
  }

  const packages = await api.request<RevenueCatList<Package>>(
    `/v2/projects/${project.id}/offerings/${offering.id}/packages?limit=100`,
  );
  const pkg =
    packages.items?.find((item) => item.lookup_key === PACKAGE_KEY) ||
    (await api.request<Package>(
      `/v2/projects/${project.id}/offerings/${offering.id}/packages`,
      {
        method: "POST",
        body: {
          lookup_key: PACKAGE_KEY,
          display_name: "Abonnement mensuel",
        },
      },
    ));

  try {
    await api.request(
      `/v2/projects/${project.id}/packages/${pkg.id}/actions/attach_products`,
      {
        method: "POST",
        body: {
          products: [
            { product_id: testProduct.id, eligibility_criteria: "all" },
            { product_id: iosProduct.id, eligibility_criteria: "all" },
            { product_id: androidProduct.id, eligibility_criteria: "all" },
          ],
        },
      },
    );
  } catch (error) {
    if (!String(error).includes("unprocessable_entity")) throw error;
  }

  const keys = await Promise.all(
    [testApp, appStoreApp, playStoreApp].map(async (app) => {
      const result = await api.request<RevenueCatList<PublicApiKey>>(
        `/v2/projects/${project.id}/apps/${app.id}/public_api_keys`,
      );
      return { app, key: result.items?.[0]?.key };
    }),
  );

  console.log("RevenueCat setup complete.");
  console.log(`REVENUECAT_PROJECT_ID=${project.id}`);
  console.log(`REVENUECAT_ENTITLEMENT_IDENTIFIER=${ENTITLEMENT_KEY}`);
  console.log(`EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=${keys[0].key ?? ""}`);
  console.log(`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=${keys[1].key ?? ""}`);
  console.log(`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=${keys[2].key ?? ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});