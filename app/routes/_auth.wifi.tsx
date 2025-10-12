import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Spinner } from "~/components/ui/spinner";
import { scanWiFiNetworks, connectToWiFi, getCurrentWiFi } from "~/services/wifi.service";
import { getUserId } from "~/lib/session.server";
import { prisma } from "~/lib/db.server";
import { logAuditEvent } from "~/lib/auth.server";
import { wifiConnectSchema } from "~/lib/validation";
import { Wifi, Lock, Unlock, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const networks = await scanWiFiNetworks();
  const currentWiFi = await getCurrentWiFi();

  return json({ networks, currentWiFi });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "connect") {
    const ssid = formData.get("ssid");
    const password = formData.get("password");
    const security = formData.get("security");

    const validation = wifiConnectSchema.safeParse({ ssid, password, security });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    const result = await connectToWiFi(
      validation.data.ssid,
      validation.data.password
    );

    if (result.success) {
      // Update settings
      await prisma.settings.updateMany({
        where: { userId: userId! },
        data: {
          currentWifiSSID: validation.data.ssid,
          wifiConfigured: true,
        },
      });

      await logAuditEvent(userId!, "wifi_configured", {
        ssid: validation.data.ssid,
        ip: result.ip,
      });

      return json({
        success: true,
        message: `Connected to ${validation.data.ssid}`,
        ip: result.ip,
      });
    }

    return json(
      { error: result.error || "Failed to connect", success: false },
      { status: 400 }
    );
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}

export default function WiFiPage() {
  const { networks, currentWiFi } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [scanning, setScanning] = useState(false);

  const getSecurityIcon = (security: string) => {
    return security === "open" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />;
  };

  const getSignalBars = (signal: number) => {
    if (signal >= 80) return 4;
    if (signal >= 60) return 3;
    if (signal >= 40) return 2;
    return 1;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">WiFi Configuration</h1>
        <p className="text-gray-600 mt-1">Connect to a wireless network</p>
      </div>

      {actionData?.success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {actionData.message}
            {actionData.ip && <span className="block mt-1">IP Address: {actionData.ip}</span>}
          </AlertDescription>
        </Alert>
      )}

      {actionData?.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {/* Current Connection */}
      {currentWiFi && (
        <Card>
          <CardHeader>
            <CardTitle>Current Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">{currentWiFi.ssid}</p>
                  <p className="text-sm text-gray-500">Signal: {currentWiFi.signal}%</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Networks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Networks</CardTitle>
              <CardDescription>Select a network to connect</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScanning(true);
                window.location.reload();
              }}
              disabled={scanning}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
              Scan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {networks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wifi className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No networks found</p>
              <p className="text-sm">Click scan to search for networks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {networks.map((network) => (
                <div
                  key={network.ssid}
                  className={`border rounded-lg p-4 cursor-pointer hover:border-primary-500 ${
                    selectedNetwork === network.ssid ? 'border-primary-500 bg-primary-50' : ''
                  }`}
                  onClick={() => setSelectedNetwork(network.ssid)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wifi className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{network.ssid}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {getSecurityIcon(network.security)}
                          <span>{network.security.toUpperCase()}</span>
                          <span>•</span>
                          <span>{network.frequency}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-3 w-1 rounded ${
                            i < getSignalBars(network.signal)
                              ? 'bg-primary-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {selectedNetwork === network.ssid && (
                    <Form method="post" className="mt-4 space-y-4">
                      <input type="hidden" name="intent" value="connect" />
                      <input type="hidden" name="ssid" value={network.ssid} />
                      <input type="hidden" name="security" value={network.security} />

                      {network.security !== 'open' && (
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter WiFi password"
                            required
                          />
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showPassword"
                              checked={showPassword}
                              onChange={(e) => setShowPassword(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="showPassword" className="font-normal cursor-pointer">
                              Show password
                            </Label>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button type="submit" className="flex-1">
                          Connect
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedNetwork(null);
                            setPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Form>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

