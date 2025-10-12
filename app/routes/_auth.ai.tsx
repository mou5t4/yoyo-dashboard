import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Switch } from "~/components/ui/switch";
import { getConversations } from "~/services/ai.service";
import { prisma } from "~/lib/db.server";
import { getUserId, logAuditEvent } from "~/lib/auth.server";
import { aiSettingsSchema } from "~/lib/validation";
import { Bot, MessageSquare, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate, formatTime, formatDuration } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const user = await prisma.user.findUnique({
    where: { id: userId! },
    include: { settings: true },
  });

  const conversations = await getConversations();

  return json({
    settings: user?.settings,
    conversations,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  const formData = await request.formData();

  const aiEnabled = formData.get("aiEnabled") === "on";
  const aiDailyLimit = formData.get("aiDailyLimit") ? Number(formData.get("aiDailyLimit")) : null;
  const conversationLogging = formData.get("conversationLogging") === "on";
  const topicFiltersRaw = formData.get("aiTopicFilters");
  const aiTopicFilters = topicFiltersRaw ? topicFiltersRaw.toString().split(',').map(t => t.trim()) : undefined;

  const validation = aiSettingsSchema.safeParse({
    aiEnabled,
    aiDailyLimit,
    aiTopicFilters,
    conversationLogging,
  });

  if (!validation.success) {
    return json(
      { error: validation.error.errors[0].message, success: false },
      { status: 400 }
    );
  }

  const updateData: any = {
    aiEnabled: validation.data.aiEnabled,
    aiDailyLimit: validation.data.aiDailyLimit,
    conversationLogging: validation.data.conversationLogging,
  };

  if (validation.data.aiTopicFilters) {
    updateData.aiTopicFilters = JSON.stringify(validation.data.aiTopicFilters);
  }

  await prisma.settings.updateMany({
    where: { userId: userId! },
    data: updateData,
  });

  await logAuditEvent(userId!, "ai_settings_updated", validation.data);

  return json({ success: true, message: "AI settings updated successfully" });
}

export default function AISettings() {
  const { settings, conversations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const topicFilters = settings?.aiTopicFilters 
    ? JSON.parse(settings.aiTopicFilters) 
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Assistant Settings</h1>
        <p className="text-gray-600 mt-1">Configure AI guardrails and monitoring</p>
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

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI Configuration</span>
          </CardTitle>
          <CardDescription>Control AI assistant behavior and limits</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable AI Assistant</Label>
                <p className="text-sm text-gray-500">
                  Allow your child to interact with the AI assistant
                </p>
              </div>
              <Switch
                name="aiEnabled"
                defaultChecked={settings?.aiEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiDailyLimit">Daily Usage Limit (minutes)</Label>
              <Input
                id="aiDailyLimit"
                name="aiDailyLimit"
                type="number"
                min="0"
                defaultValue={settings?.aiDailyLimit || ""}
                placeholder="No limit"
              />
              <p className="text-sm text-gray-500">
                Maximum minutes per day for AI interactions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiTopicFilters">Blocked Topics</Label>
              <Input
                id="aiTopicFilters"
                name="aiTopicFilters"
                placeholder="violence, politics, etc. (comma-separated)"
                defaultValue={topicFilters.join(', ')}
              />
              <p className="text-sm text-gray-500">
                Topics the AI should avoid discussing
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Conversation Logging</Label>
                <p className="text-sm text-gray-500">
                  Save conversation transcripts for parental review
                </p>
              </div>
              <Switch
                name="conversationLogging"
                defaultChecked={settings?.conversationLogging}
              />
            </div>

            <Button type="submit" className="w-full">
              Save AI Settings
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Safety Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Safety Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <Badge variant="success">Strict</Badge>
            <div>
              <p className="font-medium">Maximum Safety</p>
              <p className="text-sm text-gray-600">
                AI avoids all potentially sensitive topics and uses child-friendly language
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Badge variant="default">Moderate</Badge>
            <div>
              <p className="font-medium">Balanced Approach</p>
              <p className="text-sm text-gray-600">
                AI provides educational content while filtering inappropriate topics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Recent Conversations</span>
          </CardTitle>
          <CardDescription>Last 10 AI interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.slice(0, 10).map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{conv.summary}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(conv.timestamp)} at {formatTime(conv.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(conv.duration)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

