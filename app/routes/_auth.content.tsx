import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { getContentLibrary, getCurrentPlayback } from "~/services/content.service";
import { Music, Podcast, Album, Play, CheckCircle2 } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const contentLibrary = await getContentLibrary();
  const currentPlayback = await getCurrentPlayback();

  return json({ contentLibrary, currentPlayback });
}

export default function Content() {
  const { contentLibrary, currentPlayback } = useLoaderData<typeof loader>();

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'playlist':
        return <Music className="h-5 w-5" />;
      case 'podcast':
        return <Podcast className="h-5 w-5" />;
      case 'album':
        return <Album className="h-5 w-5" />;
      default:
        return <Music className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-1">Manage playlists, podcasts, and content filters</p>
      </div>

      {/* Current Playback */}
      {currentPlayback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Now Playing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-primary-100 rounded-lg flex items-center justify-center">
                <Music className="h-8 w-8 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{currentPlayback.title}</p>
                <p className="text-sm text-gray-600">{currentPlayback.artist}</p>
                <Badge variant="outline" className="mt-1">{currentPlayback.type}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Library */}
      <Card>
        <CardHeader>
          <CardTitle>Content Library</CardTitle>
          <CardDescription>Available playlists, podcasts, and albums</CardDescription>
        </CardHeader>
        <CardContent>
          {contentLibrary.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No content available</p>
              <p className="text-sm">Content will appear here once synced</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contentLibrary.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getContentIcon(item.type)}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.creator}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.type}
                        </Badge>
                        {item.explicit && (
                          <Badge variant="warning" className="text-xs">
                            Explicit
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : null}
                    <Switch defaultChecked={item.enabled} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Content Filters</CardTitle>
          <CardDescription>Control what content is accessible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Block Explicit Content</p>
              <p className="text-sm text-gray-500">
                Prevent access to content marked as explicit
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Age-Appropriate Filter</p>
              <p className="text-sm text-gray-500">
                Only show content suitable for children
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Button className="w-full">Save Filter Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}

