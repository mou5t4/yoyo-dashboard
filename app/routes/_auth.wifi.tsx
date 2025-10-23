import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useFetcher, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Spinner } from "~/components/ui/spinner";
import { scanWiFiNetworks, connectToWiFi, getCurrentWiFi } from "~/services/wifi.service.server";
import { getUserId } from "~/lib/session.server";
import { prisma } from "~/lib/db.server";
import { logAuditEvent } from "~/lib/auth.server";
import { wifiConnectSchema } from "~/lib/validation";
import { Wifi, Lock, Unlock, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const url = new URL(request.url);
  const scan = url.searchParams.get("scan");

  // Only get current WiFi on initial load (fast)
  const currentWiFi = await getCurrentWiFi();

  // Only scan networks if explicitly requested
  if (scan === "true") {
    const networks = await scanWiFiNetworks();
    return json({ networks, currentWiFi });
  }

  return json({ networks: null, currentWiFi });
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
  // Safely get loader data with error handling
  const loaderData = useLoaderData<typeof loader>();
  const { networks: initialNetworks, currentWiFi } = loaderData || { networks: null, currentWiFi: null };
  
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<typeof loader>();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [scanning, setScanning] = useState(false);
  const { t } = useTranslation();

  // Auto-fetch networks on mount if not already loaded
  useEffect(() => {
    if (initialNetworks === null && !fetcher.data && fetcher.state === "idle") {
      fetcher.load("?scan=true");
    }
  }, []);

  // Determine the current networks to display
  const networks = fetcher.data?.networks ?? initialNetworks ?? [];
  const isLoading = fetcher.state === "loading" || (initialNetworks === null && !fetcher.data);

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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t("wifi.title")}</h1>
        <p className="text-sm sm:text-base text-gray-700 dark:text-white/95 mt-1">{t("wifi.subtitle")}</p>
      </div>

      {actionData?.success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4 text-emerald-200" />
          <AlertDescription className="text-white">
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
            <CardTitle>{t("wifi.currentNetwork")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{currentWiFi.ssid}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("wifi.signalQuality")}: {currentWiFi.signal}%</p>
                </div>
              </div>
              <Badge className="bg-green-900 text-green-300">
                <span className="status-indicator bg-green-500 mr-1"></span>
                {t("dashboard.connected")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Networks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("wifi.availableNetworks")}</CardTitle>
              <CardDescription>{t("wifi.networkName")}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetcher.load("?scan=true");
              }}
              disabled={isLoading}
              className="touch-manipulation"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t("wifi.scanNetworks")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-700 dark:text-white/90">
              <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin text-blue-600 dark:text-white/90" />
              <p>{t("wifi.scanning")}</p>
              <p className="text-sm">{t("common.loading")}</p>
            </div>
          ) : networks.length === 0 ? (
            <div className="text-center py-8 text-gray-700 dark:text-white/90">
              <Wifi className="h-12 w-12 mx-auto mb-2 text-blue-600 dark:text-white/90" />
              <p>{t("common.noData")}</p>
              <p className="text-sm">{t("wifi.scanNetworks")}</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {networks.map((network) => (
                <div
                  key={network.ssid}
                  className={cn(
                    "bg-gray-700/50 border-2 rounded-xl p-4 sm:p-5 cursor-pointer transition-all duration-300 card-hover touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    selectedNetwork === network.ssid 
                      ? 'border-blue-500 bg-blue-900/30 shadow-xl shadow-blue-500/20' 
                      : 'border-gray-600 hover:border-blue-400 hover:shadow-lg focus-visible:border-blue-400 focus-visible:shadow-lg'
                  )}
                  onClick={() => setSelectedNetwork(network.ssid)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedNetwork(network.ssid);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <Wifi className={cn(
                        "h-6 w-6 flex-shrink-0 transition-colors duration-200",
                        selectedNetwork === network.ssid ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-white/90'
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base sm:text-lg truncate text-gray-900 dark:text-white">
                          {network.ssid}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-white/92">
                          {getSecurityIcon(network.security)}
                          <span className="uppercase font-medium">{network.security}</span>
                          <span>•</span>
                          <span>{network.frequency}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-4 w-2 rounded-sm transition-all duration-200",
                            i < getSignalBars(network.signal)
                              ? selectedNetwork === network.ssid 
                                ? 'bg-blue-300 shadow-sm shadow-blue-300/50'
                                : 'bg-white/80 shadow-sm shadow-white/30'
                              : 'bg-white/30'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {selectedNetwork === network.ssid && (
                    <div className="mt-6 p-6 glass-card rounded-xl border-2 border-white/30">
                      <Form method="post" className="space-y-5">
                        <input type="hidden" name="intent" value="connect" />
                        <input type="hidden" name="ssid" value={network.ssid} />
                        <input type="hidden" name="security" value={network.security} />

                        {network.security !== 'open' && (
                          <div className="space-y-3">
                            <Label htmlFor="password" className="text-base font-semibold text-gray-900 dark:text-white">
                              {t("wifi.password")}
                            </Label>
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder={t("wifi.enterPassword")}
                              required
                              className="h-12 text-base"
                            />
                            <div className="flex items-center space-x-3 pt-2">
                              <label className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  id="showPassword"
                                  checked={showPassword}
                                  onChange={(e) => setShowPassword(e.target.checked)}
                                  className="h-5 w-5 rounded-md border-2 border-white/40 glass-input appearance-none checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 group-hover:border-white/60"
                                  style={{
                                    backgroundImage: showPassword ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z\'/%3e%3c/svg%3e")' : 'none',
                                    backgroundSize: '12px',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center'
                                  }}
                                />
                                <Label htmlFor="showPassword" className="text-sm font-medium text-gray-700 dark:text-white/90 cursor-pointer group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200">
                                  {t("auth.showPassword")}
                                </Label>
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Button 
                            type="submit" 
                            size="lg" 
                            className="flex-1 touch-manipulation"
                            disabled={network.security !== 'open' && !password.trim()}
                          >
                            {t("wifi.connect")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setSelectedNetwork(null);
                              setPassword("");
                              setShowPassword(false);
                            }}
                            className="touch-manipulation"
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </Form>
                    </div>
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

// Error boundary for WiFi page
export function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage: string;
  let errorStatus: number;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText;
  } else if (error instanceof Error) {
    errorStatus = 500;
    errorMessage = error.message;
  } else {
    errorStatus = 500;
    errorMessage = "An unexpected error occurred";
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">WiFi Configuration</h1>
        <p className="text-sm sm:text-base text-gray-700 dark:text-white/95 mt-1">Connect to a wireless network</p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Error {errorStatus}</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            <div className="mt-4">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

