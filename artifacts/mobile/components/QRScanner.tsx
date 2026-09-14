import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface QRScannerProps {
  visible: boolean;
  onScan: (data: string) => void;
  onClose: () => void;
  hint?: string;
}

// Try to detect what kind of QR was scanned
export function detectQRType(data: string): "crypto" | "phone" | "email" | "iban" | "url" | "text" {
  // Crypto wallet patterns
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(data)) return "crypto"; // Bitcoin
  if (/^0x[a-fA-F0-9]{40}$/.test(data)) return "crypto"; // Ethereum
  if (/^T[A-Za-z1-9]{33}$/.test(data)) return "crypto"; // Tron
  if (/^(bitcoin|ethereum|litecoin|tron):/.test(data.toLowerCase())) return "crypto";

  // Phone numbers
  if (/^\+?[0-9\s\-().]{7,20}$/.test(data)) return "phone";

  // IBAN
  if (/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,34}$/.test(data.replace(/\s/g, ""))) return "iban";

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) return "email";

  // URL (could be a payment link)
  if (/^https?:\/\//.test(data)) return "url";

  return "text";
}

export default function QRScanner({ visible, onScan, onClose, hint }: QRScannerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);

  // Animated scan line
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLastData(null);
      startScanAnimation();
    }
  }, [visible]);

  function startScanAnimation() {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }

  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: ["5%", "90%"] });

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setLastData(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmScan() {
    if (lastData) {
      onScan(lastData);
      onClose();
    }
  }

  function rescan() {
    setScanned(false);
    setLastData(null);
  }

  if (!visible) return null;

  // Web fallback — no native camera
  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Scanner QR</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.webFallback}>
            <View style={[styles.webFallbackIcon, { backgroundColor: colors.card }]}>
              <Feather name="camera-off" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.webFallbackTitle, { color: colors.foreground }]}>
              Caméra non disponible
            </Text>
            <Text style={[styles.webFallbackSub, { color: colors.mutedForeground }]}>
              Le scan QR nécessite l'application mobile. Sur téléphone, ouvrez WealthAI via Expo Go pour utiliser la caméra.
            </Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
              <Text style={[styles.closeBtnText, { color: colors.primaryForeground }]}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Permission not granted */}
        {!permission?.granted ? (
          <View style={[styles.permissionView, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Scanner QR</Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.permissionContent}>
              <LinearGradient colors={["#D4AF3722", "#D4AF3711"]} style={styles.permIcon}>
                <Feather name="camera" size={40} color="#D4AF37" />
              </LinearGradient>
              <Text style={[styles.permTitle, { color: colors.foreground }]}>Accès caméra requis</Text>
              <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
                Pour scanner les QR codes de paiement, WealthAI a besoin d'accéder à votre caméra.
              </Text>
              <Pressable
                style={[styles.permBtn, { backgroundColor: colors.primary }]}
                onPress={requestPermission}
              >
                <Feather name="camera" size={18} color={colors.primaryForeground} />
                <Text style={[styles.permBtnText, { color: colors.primaryForeground }]}>Autoriser la caméra</Text>
              </Pressable>
              <Pressable onPress={onClose} style={{ marginTop: 16 }}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Annuler</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Camera view */
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Dark overlay with square cutout */}
            <View style={styles.overlay}>
              <View style={[styles.overlayTop, { paddingTop: insets.top + 16 }]}>
                {/* Header */}
                <View style={styles.scanHeader}>
                  <Pressable
                    style={[styles.scanHeaderBtn, { backgroundColor: "#00000066" }]}
                    onPress={onClose}
                  >
                    <Feather name="x" size={22} color="#fff" />
                  </Pressable>
                  <Text style={styles.scanTitle}>Scanner QR</Text>
                  <View style={{ width: 40 }} />
                </View>
                {hint && (
                  <Text style={styles.hintText}>{hint}</Text>
                )}
              </View>

              {/* Scanner frame */}
              <View style={styles.frameRow}>
                <View style={styles.frameSide} />
                <View style={styles.frame}>
                  {/* Corner marks */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Animated scan line */}
                  {!scanned && (
                    <Animated.View style={[styles.scanLine, { top: scanLineY }]}>
                      <LinearGradient
                        colors={["transparent", "#D4AF37CC", "transparent"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.scanLineGrad}
                      />
                    </Animated.View>
                  )}

                  {/* Success overlay */}
                  {scanned && (
                    <View style={styles.scannedOverlay}>
                      <View style={styles.successIcon}>
                        <Feather name="check" size={36} color="#fff" />
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.frameSide} />
              </View>

              <View style={styles.overlayBottom}>
                {!scanned ? (
                  <Text style={styles.scanSubtitle}>
                    Pointez la caméra vers un QR code de paiement
                  </Text>
                ) : (
                  <View style={styles.scannedResult}>
                    <View style={[styles.resultCard, { backgroundColor: "#0A0F1Eee" }]}>
                      <View style={styles.resultHeader}>
                        <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.resultIcon}>
                          <Feather name="check" size={16} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.resultTitle}>QR Code détecté !</Text>
                      </View>
                      <Text style={styles.resultData} numberOfLines={3}>{lastData}</Text>
                      <Text style={styles.resultType}>
                        Type : {lastData ? detectQRType(lastData).toUpperCase() : ""}
                      </Text>
                      <View style={styles.resultButtons}>
                        <Pressable style={styles.rescanBtn} onPress={rescan}>
                          <Feather name="refresh-cw" size={15} color="#fff" />
                          <Text style={styles.rescanText}>Rescanner</Text>
                        </Pressable>
                        <Pressable style={styles.useBtn} onPress={confirmScan}>
                          <Feather name="check-circle" size={15} color="#0A0F1E" />
                          <Text style={styles.useText}>Utiliser</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "700" },

  // Permission
  permissionView: { flex: 1 },
  permissionContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  permIcon: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  permSub: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  permBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  permBtnText: { fontSize: 16, fontWeight: "700" },
  cancelText: { fontSize: 15 },

  // Camera overlay
  overlay: { flex: 1, backgroundColor: "transparent" },
  overlayTop: { paddingHorizontal: 20, paddingBottom: 24 },
  scanHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  scanHeaderBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  scanTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  hintText: { color: "#ffffffCC", fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 20 },
  frameRow: { flexDirection: "row", height: FRAME_SIZE },
  frameSide: { flex: 1, backgroundColor: "#00000088" },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, position: "relative", overflow: "hidden" },

  // Corners
  corner: { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE, borderColor: "#D4AF37" },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 6 },

  // Scan line
  scanLine: { position: "absolute", left: 0, right: 0, height: 3 },
  scanLineGrad: { flex: 1, height: 3 },

  // Scanned success
  scannedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#22C55E33", alignItems: "center", justifyContent: "center" },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" },

  overlayBottom: { flex: 1, backgroundColor: "#00000088", paddingHorizontal: 24, paddingTop: 24, alignItems: "center" },
  scanSubtitle: { color: "#ffffffAA", fontSize: 14, textAlign: "center" },

  // Result card
  scannedResult: { width: "100%", gap: 12 },
  resultCard: { borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: "#22C55E44" },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  resultTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultData: { color: "#ffffffCC", fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", lineHeight: 18 },
  resultType: { color: "#D4AF37", fontSize: 11, fontWeight: "700" },
  resultButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  rescanBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#ffffff22", paddingVertical: 12, borderRadius: 12 },
  rescanText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  useBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#D4AF37", paddingVertical: 12, borderRadius: 12 },
  useText: { color: "#0A0F1E", fontSize: 14, fontWeight: "700" },

  // Web fallback
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  webFallbackIcon: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  webFallbackTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  webFallbackSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  closeBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  closeBtnText: { fontSize: 16, fontWeight: "700" },
});
