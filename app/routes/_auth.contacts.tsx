import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { prisma } from "~/lib/db.server";
import { getUserId, logAuditEvent } from "~/lib/auth.server";
import { contactSchema } from "~/lib/validation";
import { Phone, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Star } from "lucide-react";

export let handle = {
  i18n: "common",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const contacts = await prisma.contact.findMany({
    orderBy: [{ isPrimary: 'desc' }, { quickDial: 'asc' }, { name: 'asc' }],
  });

  return json({ contacts });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = formData.get("name");
    const phoneNumber = formData.get("phoneNumber");
    const relationship = formData.get("relationship") || undefined;
    const isPrimary = formData.get("isPrimary") === "on";
    const canCall = formData.get("canCall") === "on";
    const canReceive = formData.get("canReceive") === "on";
    const quickDial = formData.get("quickDial") ? Number(formData.get("quickDial")) : null;

    const validation = contactSchema.safeParse({
      name,
      phoneNumber,
      relationship,
      isPrimary,
      canCall,
      canReceive,
      quickDial,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    try {
      await prisma.contact.create({
        data: validation.data,
      });

      await logAuditEvent(userId!, "contact_created", { name: validation.data.name });

      return json({ success: true, message: "Contact added successfully" });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return json(
          { error: "Quick dial number already in use", success: false },
          { status: 400 }
        );
      }
      throw error;
    }
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;

    await prisma.contact.delete({
      where: { id },
    });

    await logAuditEvent(userId!, "contact_deleted", { contactId: id });

    return json({ success: true, message: "Contact deleted successfully" });
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}


export default function Contacts() {
  const { contacts } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showAddForm, setShowAddForm] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("contacts.title")}</h1>
          <p className="text-gray-700 dark:text-white/95 mt-1">{t("contacts.subtitle")}</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("contacts.addContact")}
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

      {/* Add Contact Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts.addContact")}</CardTitle>
            <CardDescription className="text-gray-400">{t("contacts.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="create" />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("contacts.name")} *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder={t("contacts.name")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t("contacts.phoneNumber")} *</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder={t("contacts.phoneNumber")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">{t("contacts.relationship")}</Label>
                  <Input
                    id="relationship"
                    name="relationship"
                    placeholder={t("contacts.relationship")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickDial">{t("contacts.quickDial")}</Label>
                  <Input
                    id="quickDial"
                    name="quickDial"
                    type="number"
                    min="1"
                    max="9"
                    placeholder={t("common.optional")}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    name="isPrimary"
                    className="rounded"
                  />
                  <Label htmlFor="isPrimary" className="font-normal cursor-pointer">
                    {t("contacts.isPrimary")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canCall"
                    name="canCall"
                    defaultChecked
                    className="rounded"
                  />
                  <Label htmlFor="canCall" className="font-normal cursor-pointer">
                    {t("contacts.canCall")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canReceive"
                    name="canReceive"
                    defaultChecked
                    className="rounded"
                  />
                  <Label htmlFor="canReceive" className="font-normal cursor-pointer">
                    {t("contacts.canReceive")}
                  </Label>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  {t("contacts.addContact")}
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

      {/* Contacts List */}
      <div className="space-y-4">
        {contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
              <p className="text-gray-700 dark:text-gray-400">{t("contacts.noContacts")}</p>
              <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">{t("contacts.addContact")}</p>
            </CardContent>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{contact.name}</h3>
                        {contact.isPrimary && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                        {contact.quickDial && (
                          <Badge variant="outline">Quick Dial {contact.quickDial}</Badge>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-400">{contact.phoneNumber}</p>
                      {contact.relationship && (
                        <p className="text-sm text-gray-700 dark:text-gray-400 capitalize">{contact.relationship}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        {contact.canCall && (
                          <Badge variant="success" className="text-xs">Can Call</Badge>
                        )}
                        {contact.canReceive && (
                          <Badge variant="success" className="text-xs">Can Receive</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={contact.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

