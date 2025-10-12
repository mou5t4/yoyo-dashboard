import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { scanBluetoothDevices, getPairedDevices, pairBluetoothDevice, connectBluetoothDevice, forgetBluetoothDevice } from "~/services/bluetooth.service";
import { Bluetooth, RefreshCw, Headphones, Speaker, HelpCircle } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const pairedDevices = await getPairedDevices();
  const availableDevices = await scanBluetoothDevices();

  return json({ pairedDevices, availableDevices });
}

export default function BluetoothPage() {
  const { pairedDevices, availableDevices } = useLoaderData<typeof loader>();
  const [scanning, setScanning] = useState(false);

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
        <h1 className="text-3xl font-bold text-gray-900">Bluetooth</h1>
        <p className="text-gray-600 mt-1">Manage Bluetooth connections</p>
      </div>

      {/* Paired Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Paired Devices</CardTitle>
          <CardDescription>Devices that are already paired</CardDescription>
        </CardHeader>
        <CardContent>
          {pairedDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bluetooth className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No paired devices</p>
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
                      <Badge variant="success">Connected</Badge>
                    ) : (
                      <Button size="sm">Connect</Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-600">
                      Forget
                    </Button>
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
              <CardTitle>Available Devices</CardTitle>
              <CardDescription>Nearby Bluetooth devices</CardDescription>
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
          {availableDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bluetooth className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No devices found</p>
              <p className="text-sm">Click scan to search for devices</p>
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
                    <Button size="sm">Pair</Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

