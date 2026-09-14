import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function notifyWithdrawalProcessing(amount: number, currency: string, method: string) {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏳ Retrait en cours de traitement",
      body: `Votre retrait de ${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency} via ${method} est en cours…`,
      sound: true,
    },
    trigger: null,
  });
}

export async function notifyWithdrawalCompleted(amount: number, currency: string, method: string) {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "✅ Retrait effectué avec succès",
      body: `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency} envoyé via ${method}.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function notifyWithdrawalFailed(amount: number, currency: string) {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "❌ Retrait échoué",
      body: `Le retrait de ${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency} n'a pas pu être traité. Réessayez.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function notifyInvestmentAlert(symbol: string, change: number) {
  if (Platform.OS === "web") return;
  const sign = change > 0 ? "+" : "";
  const emoji = change < -5 ? "📉" : change > 5 ? "📈" : "⚠️";
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${symbol} ${sign}${change.toFixed(1)}%`,
      body: `Votre investissement ${symbol} a bougé significativement. Consultez votre portfolio.`,
      sound: true,
    },
    trigger: null,
  });
}
