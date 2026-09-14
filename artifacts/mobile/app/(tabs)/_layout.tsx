import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Accueil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="portfolio">
        <Icon sf={{ default: "chart.line.uptrend.xyaxis", selected: "chart.line.uptrend.xyaxis" }} />
        <Label>Portfolio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts">
        <Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} />
        <Label>Comptes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budget">
        <Icon sf={{ default: "chart.pie", selected: "chart.pie.fill" }} />
        <Label>Budget</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="withdrawals">
        <Icon sf={{ default: "arrow.up.circle", selected: "arrow.up.circle.fill" }} />
        <Label>Retraits</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <Icon sf={{ default: "cpu", selected: "cpu.fill" }} />
        <Label>Conseiller</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ideas">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Idées</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Réglages</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.navy,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 62,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
          marginBottom: isWeb ? 0 : 4,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "Accueil",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="house" tintColor={color} size={19} />
          : <Feather name="home" size={19} color={color} />,
      }} />
      <Tabs.Screen name="portfolio" options={{
        title: "Portfolio",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="chart.line.uptrend.xyaxis" tintColor={color} size={19} />
          : <Feather name="trending-up" size={19} color={color} />,
      }} />
      <Tabs.Screen name="accounts" options={{
        title: "Comptes",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="building.columns" tintColor={color} size={19} />
          : <Feather name="credit-card" size={19} color={color} />,
      }} />
      <Tabs.Screen name="budget" options={{
        title: "Budget",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="chart.pie" tintColor={color} size={19} />
          : <Feather name="pie-chart" size={19} color={color} />,
      }} />
      <Tabs.Screen name="withdrawals" options={{
        title: "Retraits",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="arrow.up.circle" tintColor={color} size={19} />
          : <Feather name="arrow-up-right" size={19} color={color} />,
      }} />
      <Tabs.Screen name="ai" options={{
        title: "Conseiller",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="cpu" tintColor={color} size={19} />
          : <Feather name="cpu" size={19} color={color} />,
      }} />
      <Tabs.Screen name="ideas" options={{
        title: "Idées",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="star" tintColor={color} size={19} />
          : <Feather name="zap" size={19} color={color} />,
      }} />
      <Tabs.Screen name="settings" options={{
        title: "Réglages",
        tabBarIcon: ({ color }) => isIOS
          ? <SymbolView name="gearshape" tintColor={color} size={19} />
          : <Feather name="settings" size={19} color={color} />,
      }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
