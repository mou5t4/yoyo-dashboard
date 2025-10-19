import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
    <div className="space-y-4 sm:space-y-6">
      {/* Current Playback */}
      {currentPlayback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-900 flex items-center justify-center">
                <Play className="h-5 w-5 text-purple-400" />
              </div>
              <span>{t("content.currentlyPlaying")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-purple-900/30 rounded-lg flex items-center justify-center border border-purple-900">
                <Music className="h-8 w-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{currentPlayback.title}</p>
                <p className="text-sm text-gray-400">{currentPlayback.artist}</p>
                <Badge className="mt-1 bg-purple-900 text-purple-300">{currentPlayback.type}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Library */}
      <Card>
        <CardHeader>
          <CardTitle>{t("content.contentLibrary")}</CardTitle>
          <CardDescription className="text-gray-400">{t("content.availableContent")}</CardDescription>
        </CardHeader>
        <CardContent>
          {contentLibrary.length === 0 ? (
            <div className="text-center py-12 text-gray-700 dark:text-gray-400">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("content.noContentAvailable")}</p>
              <p className="text-sm text-gray-700 dark:text-gray-400">{t("content.contentWillAppear")}</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {contentLibrary.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 sm:p-4 border-2 border-gray-700 rounded-xl hover:border-purple-500 transition-all bg-gray-700/30"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 text-purple-400">
                      {getContentIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">{item.creator}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className="text-xs capitalize bg-purple-900/50 text-purple-300 border-purple-900">
                          {item.type}
                        </Badge>
                        {item.explicit && (
                          <Badge className="text-xs bg-yellow-900/50 text-yellow-300 border-yellow-900">
                            {t("content.explicit")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
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
          <CardTitle>{t("content.contentFilters")}</CardTitle>
          <CardDescription className="text-gray-400">{t("content.controlWhatContent")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{t("content.explicitContent")}</p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                {t("content.preventAccess")}
              </p>
            </div>
            <Switch defaultChecked className="flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{t("content.ageAppropriateFilter")}</p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                {t("content.onlyShowContent")}
              </p>
            </div>
            <Switch defaultChecked className="flex-shrink-0" />
          </div>

          <Button size="lg" className="w-full">{t("content.saveFilterSettings")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

