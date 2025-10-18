import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator, Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { MetricCard } from "~/components/MetricCard";
import { getDeviceStatus } from "~/services/device.service.server";
import { getCurrentPlayback } from "~/services/content.service";
import { getCurrentLocation } from "~/services/location.service.server";
import { getUserId, getUser } from "~/lib/auth.server";
import { formatBytes, getBatteryLevel, getSignalStrength, formatDuration } from "~/lib/utils";
import { formatDateTime as formatDateTimeLocale, formatFileSize } from "~/lib/format";
import { POLL_INTERVAL } from "~/lib/constants";
import type { SupportedLanguage } from "~/i18n";
import { 
  Battery, 
  Wifi, 
  Signal, 
  HardDrive, 
  MapPin, 
  Music, 
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Thermometer,
  Activity,
  Power,
  RefreshCw,
  Download,
  Shield
} from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = await getUser(userId!);
  
  // Fetch device status
  const deviceStatus = await getDeviceStatus();
  const currentPlayback = await getCurrentPlayback();
  const currentLocation = await getCurrentLocation();

  return json({
    deviceStatus,
    currentPlayback,
    currentLocation,
    settings: user?.settings,
  });
}

export default function Dashboard() {
  const { deviceStatus, currentPlayback, currentLocation, settings } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t } = useTranslation();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [revalidator]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const batteryLevel = getBatteryLevel(deviceStatus.battery);
  const wifiSignal = getSignalStrength(deviceStatus.signal.wifi);
  
  // Get current locale from settings or use English as default
  const currentLocale = (settings?.language as SupportedLanguage) || 'en';
  
  const formatDateTime = (date: Date) => {
    return formatDateTimeLocale(date, currentLocale);
  };

  const storagePercentage = Math.round((deviceStatus.storage.used / deviceStatus.storage.total) * 100);

  return (
    <div className="space-y-10">
      {/* System Overview Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
          <Activity className="w-6 h-6 mr-2 text-red-400" />
          {t("dashboard.deviceStatus")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Battery Card */}
          <MetricCard
            title={t("dashboard.battery")}
            value={`${deviceStatus.battery}%`}
            subtitle={deviceStatus.charging ? t("dashboard.charging") : t("dashboard.discharging")}
            statusColor={deviceStatus.battery > 50 ? "green" : deviceStatus.battery > 20 ? "yellow" : "red"}
            chartValue={deviceStatus.battery}
            chartMax={100}
          />

          {/* WiFi Card */}
          <MetricCard
            title={t("dashboard.wifi")}
            value={`${deviceStatus.signal.wifi}%`}
            subtitle={settings?.currentWifiSSID || t("dashboard.disconnected")}
            statusColor={deviceStatus.signal.wifi > 70 ? "green" : deviceStatus.signal.wifi > 40 ? "yellow" : "red"}
            chartValue={deviceStatus.signal.wifi}
            chartMax={100}
            chartColor="#3b82f6"
          />

          {/* Storage Card */}
          <MetricCard
            title={t("dashboard.storage")}
            value={`${storagePercentage}%`}
            subtitle={`${formatFileSize(deviceStatus.storage.used, currentLocale)} / ${formatFileSize(deviceStatus.storage.total, currentLocale)}`}
            statusColor={storagePercentage < 70 ? "green" : storagePercentage < 90 ? "yellow" : "red"}
            chartValue={storagePercentage}
            chartMax={100}
            chartColor="#10b981"
          />

          {/* Temperature Card */}
          <MetricCard
            title="Temperature"
            value="48°C"
            subtitle="Normal range"
            statusColor="yellow"
            showChart={false}
            icon={<Thermometer className="w-12 h-12 text-red-400" />}
          />
        </div>
      </section>

      {/* Current Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-900 flex items-center justify-center">
                <Music className="h-5 w-5 text-purple-400" />
              </div>
              <span>{t("dashboard.nowPlaying")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPlayback ? (
              <div className="space-y-2">
                <p className="font-medium text-white">{currentPlayback.title}</p>
                <p className="text-sm text-gray-400">{currentPlayback.artist}</p>
                <Badge className="bg-purple-900 text-purple-300">{currentPlayback.type}</Badge>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">{t("dashboard.noActivePlayback")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-900 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-400" />
              </div>
              <span>{t("dashboard.location")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">
                  {currentLocation.address || t("dashboard.locationTracked")}
                </p>
                <p className="text-xs text-gray-400">
                  Lat: {currentLocation.latitude.toFixed(6)}, Lon: {currentLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-gray-400">
                  Accuracy: {currentLocation.accuracy}m
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                {settings?.locationEnabled ? t("dashboard.locationUnavailable") : t("dashboard.locationTrackingDisabled")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
          <Activity className="w-6 h-6 mr-2 text-yellow-400" />
          {t("dashboard.quickActions")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Link to="/settings" className="no-underline">
            <button className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 shadow-lg card-hover flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-full bg-red-900 flex items-center justify-center mb-4">
                <Power className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-sm font-medium text-white">{t("settings.title")}</span>
            </button>
          </Link>
          <Link to="/location" className="no-underline">
            <button className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 shadow-lg card-hover flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-white">{t("dashboard.locateDevice")}</span>
            </button>
          </Link>
          <Link to="/wifi" className="no-underline">
            <button className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 shadow-lg card-hover flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center mb-4">
                <Wifi className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-sm font-medium text-white">{t("wifi.title")}</span>
            </button>
          </Link>
          <Link to="/content" className="no-underline">
            <button className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 shadow-lg card-hover flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-full bg-purple-900 flex items-center justify-center mb-4">
                <Music className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-white">{t("content.title")}</span>
            </button>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
          <Clock className="w-6 h-6 mr-2 text-purple-400" />
          Recent Activity
        </h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Device connected</h3>
                    <span className="text-xs text-gray-400" suppressHydrationWarning>
                      {new Date().toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Successfully connected to WiFi network</p>
                </div>
              </div>
              {deviceStatus.battery < 50 && (
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Battery level</h3>
                      <span className="text-xs text-gray-400">Just now</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Battery at {deviceStatus.battery}%</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alerts */}
      {deviceStatus.battery < 20 && !deviceStatus.charging && (
        <Alert variant="warning" className="bg-yellow-900/20 border-yellow-900">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-white">
            {t("dashboard.batteryLowAlert", { percent: deviceStatus.battery })}
          </AlertDescription>
        </Alert>
      )}

      {!settings?.wifiConfigured && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-900">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-white">
            {t("dashboard.wifiNotConfiguredAlert")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

