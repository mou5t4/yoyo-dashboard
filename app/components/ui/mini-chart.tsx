"use client";

import { useEffect, useRef } from "react";
import { Chart, ArcElement, DoughnutController, type ChartConfiguration } from "chart.js";

// Register Chart.js components
Chart.register(ArcElement, DoughnutController);

interface MiniChartProps {
  value: number;
  max?: number;
  color: string;
  backgroundColor?: string;
  size?: number;
}

export function MiniChart({ 
  value, 
  max = 100, 
  color, 
  backgroundColor = "rgba(156, 163, 175, 0.2)",
  size = 64 
}: MiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Calculate percentage
    const percentage = Math.min((value / max) * 100, 100);
    const remaining = 100 - percentage;

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [percentage, remaining],
            backgroundColor: [color, backgroundColor],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "70%",
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [value, max, color, backgroundColor]);

  return (
    <div style={{ width: size, height: size }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

