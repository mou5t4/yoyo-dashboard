import { Battery, BatteryCharging, Zap } from "lucide-react";

interface BatteryWidgetProps {
  level: number; // 0-100
  isCharging: boolean;
  className?: string;
}

export function BatteryWidget({ level, isCharging, className = "" }: BatteryWidgetProps) {
  // Determine color based on charge level
  const getColors = (charge: number) => {
    if (charge < 20) {
      // Red - Danger!
      return {
        c0: "#750900",
        c1: "#c6462b",
        c2: "#b74424",
        c3: "#df0a00",
        c4: "#590700",
      };
    } else if (charge < 40) {
      // Yellow - Might wanna charge soon...
      return {
        c0: "#754f00",
        c1: "#f2bb00",
        c2: "#dbb300",
        c3: "#df8f00",
        c4: "#593c00",
      };
    } else {
      // Green - All good!
      return {
        c0: "#316d08",
        c1: "#60b939",
        c2: "#51aa31",
        c3: "#64ce11",
        c4: "#255405",
      };
    }
  };

  const colors = getColors(level);
  const chargePercent = Math.max(12, Math.min(89, level)); // Clamp between 12-89 for visual effect

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 card-hover transition-colors duration-300 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          {/* Title */}
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            Battery
          </h3>
          
          {/* Value */}
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
            {level}%
          </p>
        </div>
        
        {/* Battery Icon - Compact size to match other cards */}
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="relative" style={{ width: "80px", height: "38px" }}>
            {/* Battery Body */}
            <div
              className="relative"
              style={{
                width: "80px",
                height: "38px",
                borderRadius: "3px 3px 3px 3px / 9px 9px 9px 9px",
                borderLeft: "1px solid rgba(255,255,255,0.2)",
                borderRight: "1px solid rgba(255,255,255,0.2)",
                backgroundImage: `linear-gradient(to right, transparent 5%, ${colors.c0} 5%, ${colors.c0} 7%, ${colors.c1} 8%, ${colors.c1} 10%, ${colors.c2} 11%, ${colors.c2} ${chargePercent - 3}%, ${colors.c3} ${chargePercent - 2}%, ${colors.c3} ${chargePercent}%, ${colors.c4} ${chargePercent}%, black ${chargePercent + 5}%, black 95%, transparent 95%), linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.4) 4%, rgba(255,255,255,0.2) 7%, rgba(255,255,255,0.2) 14%, rgba(255,255,255,0.8) 14%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.2) 80%, rgba(255,255,255,0.4) 86%, rgba(255,255,255,0.6) 90%, rgba(255,255,255,0.1) 92%, rgba(255,255,255,0.1) 95%, rgba(255,255,255,0.5) 98%)`,
              }}
            >
              {/* Battery Nib (positive terminal) */}
              <div
                className="absolute"
                style={{
                  width: "4px",
                  height: "17px",
                  right: "-5px",
                  top: "10px",
                  borderTopRightRadius: "2px 3px",
                  borderBottomRightRadius: "2px 3px",
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 14%, rgba(255,255,255,0.8) 14%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.2) 80%, rgba(255,255,255,0.4) 86%, rgba(255,255,255,0.6) 90%, rgba(255,255,255,0.1) 92%, rgba(255,255,255,0.1) 95%, rgba(255,255,255,0.5) 98%)",
                }}
              />

              {/* Inner battery detail layer */}
              <div
                className="absolute"
                style={{
                  width: "70px",
                  height: "38px",
                  left: "3px",
                  borderRadius: "2px 2px 2px 2px / 9px 9px 9px 9px",
                  borderLeft: "1px solid black",
                  borderRight: "1px solid black",
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.3) 4%, rgba(255,255,255,0.2) 5%, transparent 5%, transparent 14%, rgba(255,255,255,0.3) 14%, rgba(255,255,255,0.12) 40%, rgba(0,0,0,0.05) 42%, rgba(0,0,0,0.05) 48%, transparent 60%, transparent 80%, rgba(255,255,255,0.3) 87%, rgba(255,255,255,0.3) 92%, transparent 92%, transparent 97%, rgba(255,255,255,0.4) 97%), linear-gradient(to left, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) 2%, black 2%, black 6%, transparent 6%), linear-gradient(rgba(255,255,255,0) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.3) 90%, rgba(255,255,255,0) 90%)",
                }}
              />

              {/* Charging Icon Overlay */}
              {isCharging && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Subtitle */}
      <div className="mt-4 flex items-center">
        <span className={`status-indicator ${isCharging ? 'bg-green-500' : 'bg-gray-500'}`}></span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isCharging ? "Charging" : "Discharging"}
        </span>
      </div>

      {/* Low Battery Warning */}
      {level < 20 && !isCharging && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center">
          <Battery className="w-3 h-3 mr-1" />
          Low Battery
        </div>
      )}
    </div>
  );
}

