import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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

  const todayPercentage = stats.limits.dailyLimit 
    ? (stats.today.totalUsage / stats.limits.dailyLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Reports</h1>
          <p className="text-gray-600 mt-1">Track usage and activity patterns</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
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
            <Progress value={todayPercentage} className="h-3" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-500">{stats.today.musicListened}</p>
                <p className="text-sm text-gray-600">Minutes Music</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-500">{stats.today.podcastsListened}</p>
                <p className="text-sm text-gray-600">Minutes Podcasts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-500">{stats.today.calls}</p>
                <p className="text-sm text-gray-600">Calls Made</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-500">{stats.today.aiInteractions}</p>
                <p className="text-sm text-gray-600">AI Chats</p>
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
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Usage</p>
                <p className="text-3xl font-bold">{formatDuration(stats.week.totalUsage * 60)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Daily Average</p>
                <p className="text-3xl font-bold">{formatDuration(stats.week.dailyAverage * 60)}</p>
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
            <div className="space-y-4">
              {stats.week.topContent.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <Badge variant="outline" className="text-xs capitalize mt-1">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
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
              <div className="text-center text-gray-500">
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

