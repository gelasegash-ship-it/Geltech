import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

export function MiniChart({
  data,
  width = 120,
  height = 48,
  color = "#D4AF37",
  showGradient = true,
}: MiniChartProps) {
  const path = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 4;
    const w = width;
    const h = height - pad * 2;

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: pad + (1 - (v - min) / range) * h,
    }));

    const line = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
    }, "");

    const area = `${line} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

    return { line, area };
  }, [data, width, height]);

  if (data.length < 2) return null;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {showGradient && (
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.3" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
        )}
        {showGradient && (
          <Path d={path.area} fill="url(#grad)" />
        )}
        <Path d={path.line} stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
});
