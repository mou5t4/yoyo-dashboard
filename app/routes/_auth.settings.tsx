import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { getUserId, getUser, changePassword, logAuditEvent } from "~/lib/auth.server";
import { prisma } from "~/lib/db.server";
import { generalSettingsSchema, passwordChangeSchema } from "~/lib/validation";
import { CheckCircle2, AlertCircle, Settings as SettingsIcon } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = await getUser(userId!);

  if (!user || !user.settings) {
    throw new Response("Not found", { status: 404 });
  }

  return json({ user, settings: user.settings });
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
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your device configuration</p>
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

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic device configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <input type="hidden" name="intent" value="update-general" />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  name="deviceName"
                  defaultValue={settings.deviceName}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childName">Child's Name (Optional)</Label>
                <Input
                  id="childName"
                  name="childName"
                  defaultValue={settings.childName || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxVolume">Maximum Volume (%)</Label>
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
                <Label htmlFor="dailyUsageLimit">Daily Usage Limit (minutes)</Label>
                <Input
                  id="dailyUsageLimit"
                  name="dailyUsageLimit"
                  type="number"
                  min="0"
                  defaultValue={settings.dailyUsageLimit || ""}
                  placeholder="No limit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedtimeStart">Bedtime Start (HH:mm)</Label>
                <Input
                  id="bedtimeStart"
                  name="bedtimeStart"
                  type="time"
                  defaultValue={settings.bedtimeStart || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedtimeEnd">Bedtime End (HH:mm)</Label>
                <Input
                  id="bedtimeEnd"
                  name="bedtimeEnd"
                  type="time"
                  defaultValue={settings.bedtimeEnd || ""}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Content Filter</Label>
                  <p className="text-sm text-gray-500">
                    Enable age-appropriate content filtering
                  </p>
                </div>
                <Switch
                  name="contentFilterEnabled"
                  defaultChecked={settings.contentFilterEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Block Explicit Content</Label>
                  <p className="text-sm text-gray-500">
                    Block content marked as explicit
                  </p>
                </div>
                <Switch
                  name="explicitContentBlocked"
                  defaultChecked={settings.explicitContentBlocked}
                />
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Save Settings
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your dashboard password</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="change-password" />

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder="Confirm new password"
              />
            </div>

            <Button type="submit" variant="secondary">
              Change Password
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <input type="hidden" name="intent" value="factory-reset" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Factory Reset</p>
                <p className="text-sm text-gray-500">
                  Reset device to factory defaults. All data will be lost.
                </p>
              </div>
              <Button type="submit" variant="destructive">
                Reset Device
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

