import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator, Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
  Clock
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4), 0 4px 24px rgba(0,0,0,0.2)' }}>{t("dashboard.title")}</h1>
        <p className="text-base sm:text-lg text-white/90 mt-2" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
          {t("dashboard.subtitle", { deviceName: settings?.deviceName || "YoyoPod" })}
        </p>
      </div>

      {/* Current Time Display */}
      <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20">
        <CardContent className="flex items-center justify-start h-20 sm:h-24" style={{ padding: '32px' }}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white" suppressHydrationWarning>
                {formatDateTime(currentTime)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.deviceStatus")}</CardTitle>
          <CardDescription>{t("dashboard.deviceStatusDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Battery */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Battery className={`h-5 w-5 sm:h-6 sm:w-6 ${deviceStatus.charging ? 'text-green-300' : 'text-white/70'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-white">{t("dashboard.battery")}</p>
                <p className="text-xs text-white/70 truncate">
                  {deviceStatus.charging ? t("dashboard.charging") : t("dashboard.discharging")}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-white">{deviceStatus.battery}%</p>
              <Badge variant={batteryLevel === 'critical' ? 'destructive' : 'default'} className="mt-1">
                {batteryLevel}
              </Badge>
            </div>
          </div>

          <Progress value={deviceStatus.battery} className="h-2.5" />

          {/* WiFi Signal */}
          <div className="flex items-center justify-between pt-4 border-t border-white/20 gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-blue-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-white">{t("dashboard.wifi")}</p>
                <p className="text-xs text-white/70 truncate">
                  {settings?.currentWifiSSID || t("dashboard.disconnected")}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-white">{deviceStatus.signal.wifi}%</p>
              <Badge variant={wifiSignal === 'poor' ? 'warning' : 'success'} className="mt-1">
                {wifiSignal}
              </Badge>
            </div>
          </div>

          {/* Storage */}
          <div className="flex items-center justify-between pt-4 border-t border-white/20 gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <HardDrive className="h-5 w-5 sm:h-6 sm:w-6 text-white/70" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-white">{t("dashboard.storage")}</p>
                <p className="text-xs text-white/70 truncate">
                  {formatFileSize(deviceStatus.storage.used, currentLocale)} / {formatFileSize(deviceStatus.storage.total, currentLocale)}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {Math.round((deviceStatus.storage.used / deviceStatus.storage.total) * 100)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <span>{t("dashboard.nowPlaying")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPlayback ? (
              <div className="space-y-2">
                <p className="font-medium text-white">{currentPlayback.title}</p>
                <p className="text-sm text-white/70">{currentPlayback.artist}</p>
                <Badge variant="outline">{currentPlayback.type}</Badge>
              </div>
            ) : (
              <p className="text-white/70 text-sm">{t("dashboard.noActivePlayback")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>{t("dashboard.location")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">
                  {currentLocation.address || t("dashboard.locationTracked")}
                </p>
                <p className="text-xs text-white/70">
                  Lat: {currentLocation.latitude.toFixed(6)}, Lon: {currentLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-white/70">
                  Accuracy: {currentLocation.accuracy}m
                </p>
              </div>
            ) : (
              <p className="text-white/70 text-sm">
                {settings?.locationEnabled ? t("dashboard.locationUnavailable") : t("dashboard.locationTrackingDisabled")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/settings" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation text-white">
                <Lock className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">{t("dashboard.lockDevice")}</span>
              </Button>
            </Link>
            <Link to="/location" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation text-white">
                <MapPin className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">{t("dashboard.locateDevice")}</span>
              </Button>
            </Link>
            <Link to="/wifi" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation text-white">
                <Wifi className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">{t("wifi.title")}</span>
              </Button>
            </Link>
            <Link to="/content" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation text-white">
                <Music className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">{t("content.title")}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {deviceStatus.battery < 20 && !deviceStatus.charging && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("dashboard.batteryLowAlert", { percent: deviceStatus.battery })}
          </AlertDescription>
        </Alert>
      )}

      {!settings?.wifiConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("dashboard.wifiNotConfiguredAlert")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

