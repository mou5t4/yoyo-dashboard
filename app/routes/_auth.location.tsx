import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useRevalidator } from "@remix-run/react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Switch } from "~/components/ui/switch";
import { getCurrentLocation, getLocationHistory } from "~/services/location.service.server";
import { prisma } from "~/lib/db.server";
import { getUserId, logAuditEvent } from "~/lib/auth.server";
import { geofenceSchema, locationSettingsSchema } from "~/lib/validation";
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { formatDateOnly, formatTimeOnly } from "~/lib/format";
import type { SupportedLanguage } from "~/i18n";
import { ClientOnly } from "~/components/ClientOnly";
import { lazy, Suspense } from "react";

// Lazy load the map components to avoid SSR issues with Leaflet
const LocationMap = lazy(() => import("~/components/LocationMap"));
const GeofenceCreationMap = lazy(() => import("~/components/GeofenceCreationMap"));

export let handle = {
  i18n: "common",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = await prisma.user.findUnique({
    where: { id: userId! },
    include: { settings: true },
  });

  const currentLocation = await getCurrentLocation();
  const locationHistory = await getLocationHistory(7);
  const geofences = await prisma.geofence.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return json({
    currentLocation,
    locationHistory,
    geofences,
    settings: user?.settings,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-settings") {
    const locationEnabled = formData.get("locationEnabled") === "on";
    const geofencingEnabled = formData.get("geofencingEnabled") === "on";

    const validation = locationSettingsSchema.safeParse({
      locationEnabled,
      geofencingEnabled,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    await prisma.settings.updateMany({
      where: { userId: userId! },
      data: validation.data,
    });

    await logAuditEvent(userId!, "location_settings_updated", validation.data);

    return json({ success: true, message: "Location settings updated" });
  }

  if (intent === "create-geofence") {
    const name = formData.get("name");
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));
    const radius = Number(formData.get("radius"));
    const alertOnExit = formData.get("alertOnExit") === "on";
    const alertOnEnter = formData.get("alertOnEnter") === "on";

    const validation = geofenceSchema.safeParse({
      name,
      latitude,
      longitude,
      radius,
      alertOnExit,
      alertOnEnter,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    await prisma.geofence.create({
      data: validation.data,
    });

    await logAuditEvent(userId!, "geofence_created", { name: validation.data.name });

    return json({ success: true, message: "Geofence created successfully" });
  }

  if (intent === "delete-geofence") {
    const id = formData.get("id") as string;

    await prisma.geofence.delete({
      where: { id },
    });

    await logAuditEvent(userId!, "geofence_deleted", { geofenceId: id });

    return json({ success: true, message: "Geofence deleted successfully" });
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}


export default function Location() {
  const { currentLocation, locationHistory, geofences, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const revalidator = useRevalidator();
  const [showAddGeofence, setShowAddGeofence] = useState(false);
  const [geofenceLocation, setGeofenceLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const { t } = useTranslation();

  // Auto-refresh location data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [revalidator]);

  // Get current locale from settings or use English as default
  const currentLocale = (settings?.language as SupportedLanguage) || 'en';
  
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDateOnly(d, currentLocale);
  };
  
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatTimeOnly(d, currentLocale);
  };

  // Initialize geofence location when opening the form
  const handleShowAddGeofence = (show: boolean) => {
    setShowAddGeofence(show);
    if (show && currentLocation && !geofenceLocation) {
      setGeofenceLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setGeofenceLocation({ latitude: lat, longitude: lng });
  };

  return (
    <div className="space-y-6">
      {actionData?.success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {actionData.message}
          </AlertDescription>
        </Alert>
      )}

      {actionData?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("location.settings")}</CardTitle>
          <CardDescription className="text-gray-400">{t("location.settingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-settings" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("location.tracking")}</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    {t("location.trackingDescription")}
                  </p>
                </div>
                <Switch
                  name="locationEnabled"
                  defaultChecked={settings?.locationEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("location.geofencing")}</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    {t("location.geofencingDescription")}
                  </p>
                </div>
                <Switch
                  name="geofencingEnabled"
                  defaultChecked={settings?.geofencingEnabled}
                />
              </div>
            </div>

            <Button type="submit">{t("location.saveSettings")}</Button>
          </Form>
        </CardContent>
      </Card>

      {/* Current Location with Map */}
      {currentLocation && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>{t("location.currentLocation")}</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revalidator.revalidate()}
                disabled={revalidator.state === "loading"}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${revalidator.state === "loading" ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interactive Map */}
            <ClientOnly fallback={
              <div className="w-full h-[400px] md:h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400 animate-pulse" />
                  <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
                </div>
              </div>
            }>
              {() => (
                <Suspense fallback={
                  <div className="w-full h-[400px] md:h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400 animate-pulse" />
                      <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
                    </div>
                  </div>
                }>
                  <LocationMap currentLocation={currentLocation} geofences={geofences} />
                </Suspense>
              )}
            </ClientOnly>

            {/* Location Details */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 space-y-2">
              <p className="font-medium text-gray-900 dark:text-white">
                {currentLocation.address || t("location.locationTracked")}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t("location.latitude")}:</span>
                  <p className="font-mono text-gray-900 dark:text-white">{currentLocation.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t("location.longitude")}:</span>
                  <p className="font-mono text-gray-900 dark:text-white">{currentLocation.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t("location.accuracy")}:</span>
                  <p className="font-mono text-gray-900 dark:text-white">±{currentLocation.accuracy}m</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t("location.lastUpdated")}:</span>
                  <p className="font-mono text-gray-900 dark:text-white">
                    {formatTime(currentLocation.timestamp)}
                    <span className="text-xs text-gray-500 ml-2">
                      ({Math.round((Date.now() - new Date(currentLocation.timestamp).getTime()) / 1000)}s ago)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              {t("location.locateNow")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Geofences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
            <CardTitle>{t("location.geofences")}</CardTitle>
            <CardDescription className="text-gray-400">{t("location.geofencesDescription")}</CardDescription>
            </div>
            <Button onClick={() => handleShowAddGeofence(!showAddGeofence)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("location.addGeofence")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddGeofence && (
            <div className="border rounded-lg p-4 mb-4 space-y-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    Select Location on Map
                  </h3>
                  {currentLocation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGeofenceLocation({
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                      })}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Use Current Location
                    </Button>
                  )}
                </div>
                {/* Interactive Map for Geofence Creation */}
                <ClientOnly fallback={
                  <div className="w-full h-[350px] md:h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400 animate-pulse" />
                      <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
                    </div>
                  </div>
                }>
                  {() => (
                    <Suspense fallback={
                      <div className="w-full h-[350px] md:h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400 animate-pulse" />
                          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
                        </div>
                      </div>
                    }>
                      <GeofenceCreationMap
                        currentLocation={currentLocation ? {
                          latitude: currentLocation.latitude,
                          longitude: currentLocation.longitude,
                        } : undefined}
                        onLocationSelect={handleLocationSelect}
                        selectedLocation={geofenceLocation ?? undefined}
                        radius={geofenceRadius}
                      />
                    </Suspense>
                  )}
                </ClientOnly>
              </div>

              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create-geofence" />
                <input 
                  type="hidden" 
                  name="latitude" 
                  value={geofenceLocation?.latitude ?? currentLocation?.latitude ?? 0}
                />
                <input 
                  type="hidden" 
                  name="longitude" 
                  value={geofenceLocation?.longitude ?? currentLocation?.longitude ?? 0}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">{t("location.geofenceName")} *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder={t("location.geofenceNamePlaceholder")}
                      required
                    />
                  </div>

                  {/* Display selected coordinates */}
                  {geofenceLocation && (
                    <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Selected Location
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-mono">
                        Lat: {geofenceLocation.latitude.toFixed(6)}, Lon: {geofenceLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="radius">{t("location.radius")} (meters) *</Label>
                    <Input
                      id="radius"
                      name="radius"
                      type="number"
                      min="10"
                      max="10000"
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      The circle on the map shows the geofence radius
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="alertOnExit"
                      name="alertOnExit"
                      defaultChecked
                      className="rounded"
                    />
                    <Label htmlFor="alertOnExit" className="font-normal cursor-pointer">
                      {t("location.exitAlert")}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="alertOnEnter"
                      name="alertOnEnter"
                      className="rounded"
                    />
                    <Label htmlFor="alertOnEnter" className="font-normal cursor-pointer">
                      {t("location.enterAlert")}
                    </Label>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    {t("location.createGeofence")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddGeofence(false);
                      setGeofenceLocation(null);
                      setGeofenceRadius(100);
                    }}
                  >
                    {t("location.cancel")}
                  </Button>
                </div>
              </Form>
            </div>
          )}

          {geofences.length === 0 ? (
            <div className="text-center py-8 text-gray-700 dark:text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("location.noGeofences")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {geofences.map((geofence) => (
                <div
                  key={geofence.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{geofence.name}</h3>
                        <Badge variant={geofence.enabled ? "success" : "outline"}>
                          {geofence.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-400">
                        Lat: {geofence.latitude.toFixed(6)}, Lon: {geofence.longitude.toFixed(6)}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-400">Radius: {geofence.radius}m</p>
                      <div className="flex items-center space-x-2 mt-2">
                        {geofence.alertOnExit && (
                          <Badge variant="outline" className="text-xs">Exit Alert</Badge>
                        )}
                        {geofence.alertOnEnter && (
                          <Badge variant="outline" className="text-xs">Enter Alert</Badge>
                        )}
                      </div>
                    </div>

                    <Form method="post">
                      <input type="hidden" name="intent" value="delete-geofence" />
                      <input type="hidden" name="id" value={geofence.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location History */}
      {locationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("location.locationHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {locationHistory.slice(0, 10).map((location, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {location.address || t("location.locationTracked")}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-400">
                      {formatDate(location.timestamp)} {t("location.lastUpdated")} {formatTime(location.timestamp)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {location.accuracy}m
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

