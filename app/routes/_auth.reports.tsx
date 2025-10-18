import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { BarChart3, TrendingUp, Clock, Headphones, Download } from "lucide-react";
import { formatDuration } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  // In a real implementation, these would come from the device services
  const mockStats = {
    today: {
      totalUsage: 135, // minutes
      musicListened: 45,
      podcastsListened: 90,
      calls: 3,
      aiInteractions: 0,
    },
    week: {
      totalUsage: 850,
      dailyAverage: 121,
      topContent: [
        { name: "Adventure Podcast", type: "podcast", duration: 240 },
        { name: "Kids Music Playlist", type: "music", duration: 180 },
        { name: "Story Time", type: "podcast", duration: 150 },
      ],
    },
    limits: {
      dailyLimit: 180,
      aiLimit: 30,
    },
  };

  return json({ stats: mockStats });
}


export default function Reports() {
  const { stats } = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  const todayPercentage = stats.limits.dailyLimit 
    ? (stats.today.totalUsage / stats.limits.dailyLimit) * 100
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="lg" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          {t("reports.export")}
        </Button>
      </div>

      {/* Today's Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
              <span>Today's Usage</span>
            </CardTitle>
            <CardDescription>
              {formatDuration(stats.today.totalUsage * 60)} of {formatDuration(stats.limits.dailyLimit * 60)} daily limit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={todayPercentage} className="h-2.5 sm:h-3" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-primary-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary-500">{stats.today.musicListened}</p>
                <p className="text-xs sm:text-sm text-white/90 mt-1 improved-contrast-text">Minutes Music</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary-500">{stats.today.podcastsListened}</p>
                <p className="text-xs sm:text-sm text-white/90 mt-1 improved-contrast-text">Minutes Podcasts</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary-500">{stats.today.calls}</p>
                <p className="text-xs sm:text-sm text-white/90 mt-1 improved-contrast-text">Calls Made</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary-500">{stats.today.aiInteractions}</p>
                <p className="text-xs sm:text-sm text-white/90 mt-1 improved-contrast-text">AI Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>This Week</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm text-white/90 mb-2 improved-contrast-text">Total Usage</p>
                <p className="text-2xl sm:text-3xl font-bold">{formatDuration(stats.week.totalUsage * 60)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm text-white/90 mb-2 improved-contrast-text">Daily Average</p>
                <p className="text-2xl sm:text-3xl font-bold">{formatDuration(stats.week.dailyAverage * 60)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Headphones className="h-5 w-5" />
              <span>Most Listened</span>
            </CardTitle>
            <CardDescription>Top content this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {stats.week.topContent.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 text-primary-600 font-semibold text-sm sm:text-base flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{item.name}</p>
                      <Badge variant="outline" className="text-xs capitalize mt-1">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-white/90 font-medium flex-shrink-0 improved-contrast-text">
                    {formatDuration(item.duration * 60)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Usage Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center text-white/90 improved-contrast-text">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Usage chart visualization</p>
                <p className="text-sm">Charts would be implemented with a charting library</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

