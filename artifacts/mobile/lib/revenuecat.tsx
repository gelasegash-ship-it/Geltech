import Constants from "expo-constants";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_IDENTIFIER ??
  "wealthai_premium";

let configuredApiKey: string | null = null;

function getPublicApiKey() {
  if (
    __DEV__ ||
    Platform.OS === "web" ||
    Constants.executionEnvironment === "storeClient"
  ) {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }

  return Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
}

export function initializeRevenueCat() {
  const apiKey = getPublicApiKey();
  if (!apiKey) return false;
  if (configuredApiKey === apiKey) return true;

  Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO);
  Purchases.configure({ apiKey });
  configuredApiKey = apiKey;
  return true;
}

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  offering: PurchasesOffering | null;
  isConfigured: boolean;
  isPremium: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  restore: () => Promise<CustomerInfo>;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function useSubscriptionData(): SubscriptionContextValue {
  const queryClient = useQueryClient();
  const isConfigured = Boolean(getPublicApiKey());

  const customerQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    enabled: isConfigured,
    retry: false,
    staleTime: 60_000,
    queryFn: () => Purchases.getCustomerInfo(),
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    enabled: isConfigured,
    retry: false,
    staleTime: 300_000,
    queryFn: () => Purchases.getOfferings(),
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const result = await Purchases.purchasePackage(pkg);
      return result.customerInfo;
    },
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], customerInfo);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], customerInfo);
    },
  });

  const refresh = async () => {
    if (!isConfigured) return;
    await Promise.all([customerQuery.refetch(), offeringsQuery.refetch()]);
  };

  const customerInfo = customerQuery.data ?? null;
  const isPremium =
    customerInfo?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !==
    undefined;

  return useMemo(
    () => ({
      customerInfo,
      offering: offeringsQuery.data?.current ?? null,
      isConfigured,
      isPremium,
      isLoading: customerQuery.isLoading || offeringsQuery.isLoading,
      isPurchasing: purchaseMutation.isPending,
      isRestoring: restoreMutation.isPending,
      purchase: purchaseMutation.mutateAsync,
      restore: restoreMutation.mutateAsync,
      refresh,
    }),
    [
      customerInfo,
      offeringsQuery.data,
      isConfigured,
      isPremium,
      customerQuery.isLoading,
      offeringsQuery.isLoading,
      purchaseMutation.isPending,
      restoreMutation.isPending,
      purchaseMutation.mutateAsync,
      restoreMutation.mutateAsync,
    ],
  );
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = Boolean(getPublicApiKey());

  useEffect(() => {
    if (isConfigured) initializeRevenueCat();
  }, [isConfigured]);

  return (
    <SubscriptionContext.Provider value={useSubscriptionData()}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used inside SubscriptionProvider");
  }
  return context;
}