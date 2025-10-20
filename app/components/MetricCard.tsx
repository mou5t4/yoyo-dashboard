import { MiniChart } from "./ui/mini-chart";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  statusColor?: "green" | "yellow" | "red" | "blue";
  chartValue?: number;
  chartMax?: number;
  chartColor?: string;
  icon?: React.ReactNode;
  showChart?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  statusColor = "green",
  chartValue,
  chartMax = 100,
  chartColor,
  icon,
  showChart = true,
}: MetricCardProps) {
  const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  const defaultChartColors = {
    green: "#10b981",
    yellow: "#eab308",
    red: "#ef4444",
    blue: "#3b82f6",
  };

  const finalChartColor = chartColor || defaultChartColors[statusColor];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 card-hover transition-colors duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="w-16 h-16">
          {showChart && chartValue !== undefined ? (
            <MiniChart
              value={chartValue}
              max={chartMax}
              color={finalChartColor}
              size={64}
            />
          ) : (
            icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>
          )}
        </div>
      </div>
      {subtitle && (
        <div className="mt-4 flex items-center">
          <span className={`status-indicator ${statusColors[statusColor]}`}></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

