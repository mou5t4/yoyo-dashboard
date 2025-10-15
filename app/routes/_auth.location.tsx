import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
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
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDateOnly, formatTimeOnly } from "~/lib/format";
import type { SupportedLanguage } from "~/i18n";

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
  const [showAddGeofence, setShowAddGeofence] = useState(false);
  const { t } = useTranslation();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("location.title")}</h1>
        <p className="text-gray-600 mt-1">{t("location.subtitle")}</p>
      </div>

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
          <CardDescription>{t("location.settingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-settings" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("location.tracking")}</Label>
                  <p className="text-sm text-gray-500">
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
                  <p className="text-sm text-gray-500">
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

      {/* Current Location */}
      {currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>{t("location.currentLocation")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-gray-100 rounded-lg p-4 space-y-1">
              <p className="font-medium">{currentLocation.address || t("location.locationTracked")}</p>
              <p className="text-sm text-gray-600">
                {t("location.latitude")}: {currentLocation.latitude.toFixed(6)}, {t("location.longitude")}: {currentLocation.longitude.toFixed(6)}
              </p>
              <p className="text-sm text-gray-600">{t("location.accuracy")}: {currentLocation.accuracy}m</p>
              <p className="text-xs text-gray-500">
                {t("location.lastUpdated")}: {formatTime(currentLocation.timestamp)}
              </p>
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
            <CardDescription>{t("location.geofencesDescription")}</CardDescription>
            </div>
            <Button onClick={() => setShowAddGeofence(!showAddGeofence)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("location.addGeofence")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddGeofence && (
            <div className="border rounded-lg p-4 mb-4">
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create-geofence" />

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

                  <div className="space-y-2">
                    <Label htmlFor="latitude">{t("location.latitude")} *</Label>
                    <Input
                      id="latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      placeholder="37.7749"
                      defaultValue={currentLocation?.latitude}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longitude">{t("location.longitude")} *</Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      placeholder="-122.4194"
                      defaultValue={currentLocation?.longitude}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="radius">{t("location.radius")} *</Label>
                    <Input
                      id="radius"
                      name="radius"
                      type="number"
                      min="10"
                      max="10000"
                      defaultValue="100"
                      required
                    />
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
                    onClick={() => setShowAddGeofence(false)}
                  >
                    {t("location.cancel")}
                  </Button>
                </div>
              </Form>
            </div>
          )}

          {geofences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                        <h3 className="font-semibold">{geofence.name}</h3>
                        <Badge variant={geofence.enabled ? "success" : "outline"}>
                          {geofence.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Lat: {geofence.latitude.toFixed(6)}, Lon: {geofence.longitude.toFixed(6)}
                      </p>
                      <p className="text-sm text-gray-600">Radius: {geofence.radius}m</p>
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
                    <p className="text-sm font-medium">
                      {location.address || t("location.locationTracked")}
                    </p>
                    <p className="text-xs text-gray-500">
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

