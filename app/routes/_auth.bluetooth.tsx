import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, Form, useActionData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { scanBluetoothDevices, getPairedDevices, pairBluetoothDevice, connectBluetoothDevice, forgetBluetoothDevice } from "~/services/bluetooth.service.server";
import { Bluetooth, RefreshCw, Headphones, Speaker, HelpCircle, CheckCircle2, XCircle } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const scan = url.searchParams.get("scan");

  // Always get paired devices (fast)
  const pairedDevices = await getPairedDevices();

  // Only scan for available devices if explicitly requested
  if (scan === "true") {
    const availableDevices = await scanBluetoothDevices();
    return json({ pairedDevices, availableDevices });
  }

  return json({ pairedDevices, availableDevices: null });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const address = formData.get("address") as string;

  if (intent === "pair") {
    const result = await pairBluetoothDevice(address);
    if (result.success) {
      return json({ success: true, message: "Device paired successfully" });
    }
    return json({ success: false, error: "Failed to pair device" }, { status: 400 });
  }

  if (intent === "connect") {
    const result = await connectBluetoothDevice(address);
    if (result.success) {
      return json({ success: true, message: "Device connected successfully" });
    }
    return json({ success: false, error: "Failed to connect device" }, { status: 400 });
  }

  if (intent === "forget") {
    const result = await forgetBluetoothDevice(address);
    if (result.success) {
      return json({ success: true, message: "Device forgotten successfully" });
    }
    return json({ success: false, error: "Failed to forget device" }, { status: 400 });
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
}


export default function BluetoothPage() {
  const { pairedDevices, availableDevices: initialAvailable } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<typeof loader>();
  const { t } = useTranslation();

  // Auto-fetch available devices on mount if not already loaded
  useEffect(() => {
    if (initialAvailable === null && !fetcher.data && fetcher.state === "idle") {
      fetcher.load("?scan=true");
    }
  }, []);

  // Determine the current available devices to display
  const availableDevices = fetcher.data?.availableDevices ?? initialAvailable ?? [];
  const isScanning = fetcher.state === "loading" || (initialAvailable === null && !fetcher.data);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'headphones':
        return <Headphones className="h-5 w-5" />;
      case 'speaker':
        return <Speaker className="h-5 w-5" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("bluetooth.title")}</h1>
        <p className="text-gray-600 mt-1">{t("bluetooth.subtitle")}</p>
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
          <XCircle className="h-4 w-4" />
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {/* Paired Devices */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bluetooth.pairedDevices")}</CardTitle>
          <CardDescription>{t("bluetooth.pairedDevices")}</CardDescription>
        </CardHeader>
        <CardContent>
          {pairedDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bluetooth className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("bluetooth.noDevices")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pairedDevices.map((device) => (
                <div
                  key={device.address}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(device.type)}
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-gray-500">{device.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {device.connected ? (
                      <Badge variant="success">{t("bluetooth.connected")}</Badge>
                    ) : (
                      <Form method="post">
                        <input type="hidden" name="intent" value="connect" />
                        <input type="hidden" name="address" value={device.address} />
                        <Button type="submit" size="sm">{t("bluetooth.connect")}</Button>
                      </Form>
                    )}
                    <Form method="post">
                      <input type="hidden" name="intent" value="forget" />
                      <input type="hidden" name="address" value={device.address} />
                      <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                        {t("bluetooth.unpair")}
                      </Button>
                    </Form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Devices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("bluetooth.availableDevices")}</CardTitle>
              <CardDescription>{t("bluetooth.availableDevices")}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetcher.load("?scan=true");
              }}
              disabled={isScanning}
              className="touch-manipulation"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
              {t("common.search")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isScanning ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin" />
              <p>{t("bluetooth.scanning")}</p>
              <p className="text-sm">{t("common.loading")}</p>
            </div>
          ) : availableDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bluetooth className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("bluetooth.noDevices")}</p>
              <p className="text-sm">{t("common.search")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableDevices
                .filter((device) => !device.paired)
                .map((device) => (
                  <div
                    key={device.address}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary-500"
                  >
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(device.type)}
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-gray-500">{device.address}</p>
                      </div>
                    </div>
                    <Form method="post">
                      <input type="hidden" name="intent" value="pair" />
                      <input type="hidden" name="address" value={device.address} />
                      <Button type="submit" size="sm">{t("bluetooth.pair")}</Button>
                    </Form>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

