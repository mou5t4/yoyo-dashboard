import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Switch } from "~/components/ui/switch";
import { prisma } from "~/lib/db.server";
import { getUserId, logAuditEvent } from "~/lib/auth.server";
import { scheduleSchema } from "~/lib/validation";
import { DAYS_OF_WEEK } from "~/lib/constants";
import { Calendar, Plus, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export let handle = {
  i18n: "common",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const schedules = await prisma.contentSchedule.findMany({
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return json({ schedules });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = formData.get("name");
    const dayOfWeek = Number(formData.get("dayOfWeek"));
    const startTime = formData.get("startTime");
    const endTime = formData.get("endTime");
    const allowMusic = formData.get("allowMusic") === "on";
    const allowPodcasts = formData.get("allowPodcasts") === "on";
    const allowAI = formData.get("allowAI") === "on";

    const validation = scheduleSchema.safeParse({
      name,
      dayOfWeek,
      startTime,
      endTime,
      allowMusic,
      allowPodcasts,
      allowAI,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    await prisma.contentSchedule.create({
      data: validation.data,
    });

    await logAuditEvent(userId!, "schedule_created", { name: validation.data.name });

    return json({ success: true, message: "Schedule created successfully" });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;

    await prisma.contentSchedule.delete({
      where: { id },
    });

    await logAuditEvent(userId!, "schedule_deleted", { scheduleId: id });

    return json({ success: true, message: "Schedule deleted successfully" });
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}


export default function Schedule() {
  const { schedules } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showAddForm, setShowAddForm] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white high-contrast-white">{t("schedule.title")}</h1>
          <p className="text-white/95 mt-1 improved-contrast-text">{t("schedule.subtitle")}</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("schedule.addSchedule")}
        </Button>
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

      {/* Add Schedule Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("schedule.addSchedule")}</CardTitle>
            <CardDescription className="text-gray-400">{t("schedule.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="create" />

              <div className="space-y-2">
                <Label htmlFor="name">{t("schedule.scheduleName")} *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("schedule.scheduleName")}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">{t("schedule.dayOfWeek")} *</Label>
                  <select
                    id="dayOfWeek"
                    name="dayOfWeek"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">{t("schedule.startTime")} *</Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">{t("schedule.endTime")} *</Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="time"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Allowed Content Types</Label>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowMusic"
                    name="allowMusic"
                    defaultChecked
                    className="rounded"
                  />
                  <Label htmlFor="allowMusic" className="font-normal cursor-pointer">
                    {t("schedule.allowMusic")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowPodcasts"
                    name="allowPodcasts"
                    defaultChecked
                    className="rounded"
                  />
                  <Label htmlFor="allowPodcasts" className="font-normal cursor-pointer">
                    {t("schedule.allowPodcasts")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowAI"
                    name="allowAI"
                    className="rounded"
                  />
                  <Label htmlFor="allowAI" className="font-normal cursor-pointer">
                    {t("schedule.allowAI")}
                  </Label>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  {t("schedule.addSchedule")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-white/90" />
              <p className="text-white/90 improved-contrast-text">No schedules configured</p>
              <p className="text-sm text-white/90 mt-1 improved-contrast-text">Add your first schedule to get started</p>
            </CardContent>
          </Card>
        ) : (
          DAYS_OF_WEEK.map((day, dayIndex) => {
            const daySchedules = schedules.filter(s => s.dayOfWeek === dayIndex);
            
            if (daySchedules.length === 0) return null;

            return (
              <Card key={dayIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>{day}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{schedule.name}</h4>
                          <Badge variant={schedule.enabled ? "success" : "outline"}>
                            {schedule.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-white/90 mb-2 improved-contrast-text">
                          <Clock className="h-4 w-4" />
                          <span>
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {schedule.allowMusic && (
                            <Badge variant="outline" className="text-xs">Music</Badge>
                          )}
                          {schedule.allowPodcasts && (
                            <Badge variant="outline" className="text-xs">Podcasts</Badge>
                          )}
                          {schedule.allowAI && (
                            <Badge variant="outline" className="text-xs">AI</Badge>
                          )}
                        </div>
                      </div>

                      <Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={schedule.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Form>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

