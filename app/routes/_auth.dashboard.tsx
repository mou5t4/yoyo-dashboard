import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator, Link } from "@remix-run/react";
import { useEffect } from "react";
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
import { POLL_INTERVAL } from "~/lib/constants";
import { 
  Battery, 
  Wifi, 
  Signal, 
  HardDrive, 
  MapPin, 
  Music, 
  Lock,
  AlertTriangle,
  CheckCircle2
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [revalidator]);

  const batteryLevel = getBatteryLevel(deviceStatus.battery);
  const wifiSignal = getSignalStrength(deviceStatus.signal.wifi);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Monitor your {settings?.deviceName || "YoyoPod"} device
        </p>
      </div>

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle>Device Status</CardTitle>
          <CardDescription>Real-time device information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Battery */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Battery className={`h-5 w-5 sm:h-6 sm:w-6 ${deviceStatus.charging ? 'text-green-500' : 'text-gray-500'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium">Battery</p>
                <p className="text-xs text-gray-500 truncate">
                  {deviceStatus.charging ? "Charging" : "Discharging"}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold">{deviceStatus.battery}%</p>
              <Badge variant={batteryLevel === 'critical' ? 'destructive' : 'default'} className="mt-1">
                {batteryLevel}
              </Badge>
            </div>
          </div>

          <Progress value={deviceStatus.battery} className="h-2.5" />

          {/* WiFi Signal */}
          <div className="flex items-center justify-between pt-4 border-t gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium">WiFi Signal</p>
                <p className="text-xs text-gray-500 truncate">
                  {settings?.currentWifiSSID || "Not connected"}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold">{deviceStatus.signal.wifi}%</p>
              <Badge variant={wifiSignal === 'poor' ? 'warning' : 'success'} className="mt-1">
                {wifiSignal}
              </Badge>
            </div>
          </div>

          {/* Storage */}
          <div className="flex items-center justify-between pt-4 border-t gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <HardDrive className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium">Storage</p>
                <p className="text-xs text-gray-500 truncate">
                  {formatBytes(deviceStatus.storage.used)} / {formatBytes(deviceStatus.storage.total)}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold">
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
              <span>Now Playing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPlayback ? (
              <div className="space-y-2">
                <p className="font-medium">{currentPlayback.title}</p>
                <p className="text-sm text-gray-600">{currentPlayback.artist}</p>
                <Badge variant="outline">{currentPlayback.type}</Badge>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active playback</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {currentLocation.address || "Location tracked"}
                </p>
                <p className="text-xs text-gray-500">
                  Lat: {currentLocation.latitude.toFixed(6)}, Lon: {currentLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">
                  Accuracy: {currentLocation.accuracy}m
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {settings?.locationEnabled ? "Location unavailable" : "Location tracking disabled"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/settings" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation">
                <Lock className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">Lock Device</span>
              </Button>
            </Link>
            <Link to="/location" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation">
                <MapPin className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">Locate Now</span>
              </Button>
            </Link>
            <Link to="/wifi" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation">
                <Wifi className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">WiFi Settings</span>
              </Button>
            </Link>
            <Link to="/content" className="no-underline">
              <Button variant="outline" className="h-24 sm:h-20 flex flex-col justify-center items-center gap-2 w-full touch-manipulation">
                <Music className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">Content</span>
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
            Device battery is low ({deviceStatus.battery}%). Consider charging soon.
          </AlertDescription>
        </Alert>
      )}

      {!settings?.wifiConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            WiFi not configured. Go to WiFi settings to connect to a network.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

