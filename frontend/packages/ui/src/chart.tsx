"use client";

import { useEffect, useRef } from "react";
import type { ECharts, EChartsCoreOption } from "echarts";

export const chartSeries = ["#1F7A4D", "#44403C", "#1E3A5F", "#92400E", "#57534E", "#5346E0"];

export function Chart({ option, height = 280 }: { option: EChartsCoreOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: ECharts | null = null;
    let cancelled = false;

    void import("echarts").then((echarts) => {
      if (!ref.current || cancelled) return;
      chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
      chart.setOption(option);
      chart.resize();
    });

    const onResize = () => chart?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      chart?.dispose();
    };
  }, [option]);

  return <div ref={ref} style={{ height }} />;
}
