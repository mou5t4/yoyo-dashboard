import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Select } from "~/components/ui/select";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { getUserId, getUser, changePassword, logAuditEvent } from "~/lib/auth.server";
import { prisma } from "~/lib/db.server";
import { generalSettingsSchema, passwordChangeSchema, systemSettingsSchema } from "~/lib/validation";
import { CheckCircle2, AlertCircle, Settings as SettingsIcon, Clock, Lock, AlertTriangle, Shield } from "lucide-react";
import { getSystemTimeInfo, getAvailableTimezones, setSystemDateTime, setSystemTimezone } from "~/services/system.service.server";

export let handle = {
  i18n: "common",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = await getUser(userId!);

  if (!user || !user.settings) {
    throw new Response("Not found", { status: 404 });
  }

  // Fetch system time info and available timezones
  const [systemTimeInfo, availableTimezones] = await Promise.all([
    getSystemTimeInfo(),
    getAvailableTimezones(),
  ]);

  return json({ 
    user, 
    settings: user.settings,
    systemTimeInfo,
    availableTimezones,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-general") {
    const deviceName = formData.get("deviceName");
    const childName = formData.get("childName") || null;
    const maxVolume = Number(formData.get("maxVolume"));
    const dailyUsageLimit = formData.get("dailyUsageLimit") ? Number(formData.get("dailyUsageLimit")) : null;
    const bedtimeStart = formData.get("bedtimeStart") || null;
    const bedtimeEnd = formData.get("bedtimeEnd") || null;
    const contentFilterEnabled = formData.get("contentFilterEnabled") === "on";
    const explicitContentBlocked = formData.get("explicitContentBlocked") === "on";

    const validation = generalSettingsSchema.safeParse({
      deviceName,
      childName,
      maxVolume,
      dailyUsageLimit,
      bedtimeStart,
      bedtimeEnd,
      contentFilterEnabled,
      explicitContentBlocked,
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

    await logAuditEvent(userId!, "settings_updated", validation.data);

    return json({ success: true, message: "Settings updated successfully" });
  }

  if (intent === "update-system") {
    const datetime = formData.get("datetime") || undefined;
    const timezone = formData.get("timezone");

    const validation = systemSettingsSchema.safeParse({
      datetime,
      timezone,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    try {
      // Set timezone if provided
      if (validation.data.timezone) {
        const timezoneResult = await setSystemTimezone(validation.data.timezone);
        if (!timezoneResult.success) {
          return json(
            { error: timezoneResult.error || "Failed to set timezone", success: false },
            { status: 500 }
          );
        }

        // Update timezone in database
        await prisma.settings.updateMany({
          where: { userId: userId! },
          data: { timezone: validation.data.timezone },
        });
      }

      // Set datetime if provided
      if (validation.data.datetime) {
        const datetimeResult = await setSystemDateTime(validation.data.datetime);
        if (!datetimeResult.success) {
          return json(
            { error: datetimeResult.error || "Failed to set date/time", success: false },
            { status: 500 }
          );
        }
      }

      await logAuditEvent(userId!, "system_settings_updated", validation.data);

      return json({ success: true, message: "System settings updated successfully" });
    } catch (error) {
      return json(
        { error: "Failed to update system settings", success: false },
        { status: 500 }
      );
    }
  }

  if (intent === "change-password") {
    const currentPassword = formData.get("currentPassword");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    const validation = passwordChangeSchema.safeParse({
      currentPassword,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    try {
      await changePassword(userId!, validation.data.password);
      return json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      return json(
        { error: "Failed to change password", success: false },
        { status: 500 }
      );
    }
  }

  if (intent === "factory-reset") {
    // This would trigger a factory reset - in reality, this would be handled by the device service
    await logAuditEvent(userId!, "factory_reset_requested", {});
    return json({ success: true, message: "Factory reset initiated" });
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}


export default function Settings() {
  const { settings, systemTimeInfo, availableTimezones } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t } = useTranslation();

  // Update current time display every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: settings.timezone || 'UTC',
    }).format(date);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t("settings.title")}</h1>
        <p className="text-sm sm:text-base text-gray-700 dark:text-white/95 mt-1">{t("settings.subtitle")}</p>
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

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-900 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            {t("settings.systemSettings")}
          </CardTitle>
          <CardDescription className="text-gray-400">{t("settings.systemSettingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Time Display */}
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-300 mb-1">{t("settings.currentTime")}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" suppressHydrationWarning>
                  {formatDateTime(currentTime)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("settings.timezone")}: {settings.timezone || systemTimeInfo.timezone}
                  {systemTimeInfo.ntpSynchronized && (
                    <span className="ml-2 inline-flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
                      {t("settings.ntpSynced")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="update-system" />

            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="datetime" className="text-sm font-medium">{t("settings.setDateTime")}</Label>
                <Input
                  id="datetime"
                  name="datetime"
                  type="datetime-local"
                  step="1"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">{t("settings.leaveEmptyKeepCurrent")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium">{t("settings.timezone")}</Label>
                <Select
                  id="timezone"
                  name="timezone"
                  defaultValue={settings.timezone || systemTimeInfo.timezone}
                  required
                >
                  {availableTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Clock className="h-4 w-4 mr-2" />
              {t("settings.updateSystemSettings")}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-900 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-purple-400" />
            </div>
            {t("settings.general")}
          </CardTitle>
          <CardDescription className="text-gray-400">{t("settings.generalDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="update-general" />

            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviceName" className="text-sm font-medium">{t("settings.deviceName")}</Label>
                <Input
                  id="deviceName"
                  name="deviceName"
                  defaultValue={settings.deviceName}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childName" className="text-sm font-medium">{t("settings.childName")}</Label>
                <Input
                  id="childName"
                  name="childName"
                  defaultValue={settings.childName || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxVolume" className="text-sm font-medium">{t("settings.maxVolume")}</Label>
                <Input
                  id="maxVolume"
                  name="maxVolume"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={settings.maxVolume}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyUsageLimit" className="text-sm font-medium">{t("settings.dailyUsageLimit")}</Label>
                <Input
                  id="dailyUsageLimit"
                  name="dailyUsageLimit"
                  type="number"
                  min="0"
                  defaultValue={settings.dailyUsageLimit || ""}
                  placeholder={t("common.noLimit")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedtimeStart" className="text-sm font-medium">{t("settings.bedtimeStart")}</Label>
                <Input
                  id="bedtimeStart"
                  name="bedtimeStart"
                  type="time"
                  defaultValue={settings.bedtimeStart || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedtimeEnd" className="text-sm font-medium">{t("settings.bedtimeEnd")}</Label>
                <Input
                  id="bedtimeEnd"
                  name="bedtimeEnd"
                  type="time"
                  defaultValue={settings.bedtimeEnd || ""}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">{t("settings.contentFilter")}</Label>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {t("settings.contentFilterDesc")}
                  </p>
                </div>
                <Switch
                  name="contentFilterEnabled"
                  defaultChecked={settings.contentFilterEnabled}
                  className="flex-shrink-0"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">{t("settings.explicitContent")}</Label>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {t("settings.explicitContentDesc")}
                  </p>
                </div>
                <Switch
                  name="explicitContentBlocked"
                  defaultChecked={settings.explicitContentBlocked}
                  className="flex-shrink-0"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto">
              {t("common.save")}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-900 flex items-center justify-center">
              <Shield className="h-5 w-5 text-indigo-400" />
            </div>
            {t("settings.changePassword")}
          </CardTitle>
          <CardDescription className="text-gray-400">{t("settings.securityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="change-password" />

            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium">{t("settings.currentPassword")}</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder={t("settings.currentPassword")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("settings.newPassword")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder={t("settings.newPassword")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">{t("settings.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder={t("settings.confirmPassword")}
              />
            </div>

            <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto">
              {t("settings.changePasswordButton")}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900 bg-red-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-900 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            {t("settings.advanced")}
          </CardTitle>
          <CardDescription className="text-gray-400">{t("settings.advancedDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <input type="hidden" name="intent" value="factory-reset" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t("settings.resetDevice")}</p>
                <p className="text-sm text-gray-400">
                  {t("settings.resetDeviceDesc")}
                </p>
              </div>
              <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700">
                {t("settings.resetDevice")}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

