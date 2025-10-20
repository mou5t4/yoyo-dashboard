import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { prisma } from "~/lib/db.server";
import { createDefaultUser, verifyLogin, changePassword, logAuditEvent } from "~/lib/auth.server";
import { createUserSession, getUserId } from "~/lib/session.server";
import { loginSchema, passwordChangeSchema } from "~/lib/validation";
import { APP_NAME, DEFAULT_PASSWORD } from "~/lib/constants";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  
  // If already logged in, redirect to dashboard
  if (userId) {
    return redirect("/dashboard");
  }

  // Check app state
  const appState = await prisma.appState.findUnique({
    where: { id: "singleton" },
  });

  if (!appState) {
    // Initialize app state
    await prisma.appState.create({
      data: {
        id: "singleton",
        isFirstRun: true,
        licenseAccepted: false,
        setupCompleted: false,
      },
    });
  }

  return json({
    isFirstRun: appState?.isFirstRun ?? true,
    licenseAccepted: appState?.licenseAccepted ?? false,
    setupCompleted: appState?.setupCompleted ?? false,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "accept-license") {
    await prisma.appState.update({
      where: { id: "singleton" },
      data: { licenseAccepted: true },
    });
    
    // Create default user
    await createDefaultUser();
    
    return json({ success: true, step: "password" });
  }

  if (intent === "set-password") {
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    const validation = passwordChangeSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: "parent" },
    });

    if (!user) {
      return json({ error: "User not found", success: false }, { status: 404 });
    }

    await changePassword(user.id, validation.data.password);
    await prisma.appState.update({
      where: { id: "singleton" },
      data: { isFirstRun: false, setupCompleted: true },
    });

    await logAuditEvent(user.id, "setup_completed", {});

    return createUserSession(user.id, "/dashboard");
  }

  if (intent === "login") {
    const username = formData.get("username");
    const password = formData.get("password");

    const validation = loginSchema.safeParse({ username, password });
    
    if (!validation.success) {
      return json(
        { error: validation.error.errors[0].message, success: false },
        { status: 400 }
      );
    }

    const user = await verifyLogin(
      validation.data.username,
      validation.data.password
    );

    if (!user) {
      await logAuditEvent(null, "login_failed", { username: validation.data.username });
      return json(
        { error: "Invalid username or password", success: false },
        { status: 401 }
      );
    }

    await logAuditEvent(user.id, "login_success", {});

    if (user.mustChangePassword) {
      return json({ success: true, mustChangePassword: true, userId: user.id });
    }

    return createUserSession(user.id, "/dashboard");
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}

export default function Index() {
  const { isFirstRun, licenseAccepted, setupCompleted } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  // Debug: Log action data to console
  if (typeof window !== 'undefined' && actionData) {
    console.log('🔍 Login Response:', actionData);
  }

  // First run: License agreement
  if (isFirstRun && !licenseAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">{t("license.title", { appName: APP_NAME })}</CardTitle>
            <CardDescription className="text-sm">{t("license.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none mb-6 max-h-96 overflow-y-auto bg-white/10 backdrop-blur-sm border border-white/20 p-3 sm:p-4 rounded-lg text-xs sm:text-sm text-white">
              <h3 className="font-semibold text-white">{t("license.heading")}</h3>
              <p className="text-white/95 improved-contrast-text"><strong>{t("license.lastUpdated")}:</strong> {new Date().toLocaleDateString()}</p>
              
              <h4 className="font-semibold mt-4 text-white">{t("license.privacy.title")}</h4>
              <p className="text-white/95 improved-contrast-text">{t("license.privacy.content")}</p>

              <h4 className="font-semibold mt-4 text-white">{t("license.coppa.title")}</h4>
              <p className="text-white/95 improved-contrast-text">{t("license.coppa.content")}</p>

              <h4 className="font-semibold mt-4 text-white">{t("license.gdpr.title")}</h4>
              <p className="text-white/95 improved-contrast-text">{t("license.gdpr.content")}</p>

              <h4 className="font-semibold mt-4 text-white">{t("license.liability.title")}</h4>
              <p className="text-white/95 improved-contrast-text">{t("license.liability.content")}</p>

              <h4 className="font-semibold mt-4 text-white">{t("license.ai.title")}</h4>
              <p className="text-white/95 improved-contrast-text">{t("license.ai.content")}</p>

              <h4 className="font-semibold mt-4 text-white">{t("license.terms.title")}</h4>
              <p className="text-white/95 improved-contrast-text">{t("license.terms.content")}</p>
            </div>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="accept-license" />
              <Button type="submit" className="w-full" size="lg">
                {t("license.accept")}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // First run: Password setup
  if (isFirstRun && licenseAccepted && !setupCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">{t("setup.setPassword")}</CardTitle>
            <CardDescription className="text-sm">
              {t("setup.setPasswordDescription", { appName: APP_NAME })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actionData?.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="set-password" />
              
              <div className="space-y-2">
                <Label htmlFor="password">{t("setup.newPassword")}</Label>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder={t("setup.enterPassword")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("setup.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder={t("setup.confirmYourPassword")}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showPassword" className="font-normal cursor-pointer">
                  {t("auth.showPassword")}
                </Label>
              </div>

              <div className="text-sm text-white/95 space-y-1 improved-contrast-text">
                <p>{t("setup.passwordRequirements")}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t("setup.passwordLength")}</li>
                  <li>{t("setup.passwordCase")}</li>
                  <li>{t("setup.passwordNumber")}</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" size="lg">
                {t("setup.completeSetup")}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular login
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/30">
            <span className="text-2xl sm:text-3xl text-white font-bold drop-shadow-lg">Y</span>
          </div>
          <CardTitle className="text-2xl sm:text-3xl">{APP_NAME}</CardTitle>
          <CardDescription className="text-sm">{t("app.parentDashboard")}</CardDescription>
        </CardHeader>
        <CardContent>
          {actionData?.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{actionData.error}</AlertDescription>
            </Alert>
          )}

          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="login" />
            
            <div className="space-y-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                defaultValue="parent"
                placeholder="parent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder={t("setup.enterPassword")}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showPassword" className="font-normal cursor-pointer">
                {t("auth.showPassword")}
              </Label>
            </div>

            <Button type="submit" className="w-full" size="lg">
              {t("auth.signIn")}
            </Button>
          </Form>

          <div className="mt-4 text-center text-sm text-white/95 improved-contrast-text">
            <p>{t("auth.defaultPassword")}: <code className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-white border border-white/30">{DEFAULT_PASSWORD}</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

