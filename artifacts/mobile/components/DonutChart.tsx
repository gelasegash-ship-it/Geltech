import React from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  centerColor?: string;
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 20,
  centerLabel,
  centerValue,
  centerColor = "#E8EAF0",
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  let offset = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${cx},${cy}`}>
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const currentOffset = offset;
            offset += dash;

            return (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={styles.center}>
          {centerValue && (
            <Text style={[styles.centerValue, { color: centerColor }]} numberOfLines={1}>
              {centerValue}
            </Text>
          )}
          {centerLabel && (
            <Text style={[styles.centerLabel, { color: centerColor + "99" }]}>
              {centerLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center" },
  centerValue: { fontSize: 18, fontWeight: "800" },
  centerLabel: { fontSize: 11, marginTop: 2 },
});
