import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
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

  // First run: License agreement
  if (isFirstRun && !licenseAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">Welcome to {APP_NAME}</CardTitle>
            <CardDescription className="text-sm">Please read and accept the license agreement to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none mb-6 max-h-96 overflow-y-auto bg-gray-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
              <h3 className="font-semibold">YoyoPod License Agreement</h3>
              <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
              
              <h4 className="font-semibold mt-4">1. Data Collection and Privacy</h4>
              <p>
                YoyoPod collects and stores data LOCALLY on this device only. No data is transmitted
                to cloud services or third parties. All information remains on your device.
              </p>

              <h4 className="font-semibold mt-4">2. COPPA Compliance</h4>
              <p>
                This device is designed for use by children. We comply with the Children's Online
                Privacy Protection Act (COPPA). No personal information about children is collected
                or shared without parental consent.
              </p>

              <h4 className="font-semibold mt-4">3. GDPR Compliance</h4>
              <p>
                For users in the European Union, we comply with GDPR regulations. You have the right
                to access, modify, or delete any data stored on this device at any time.
              </p>

              <h4 className="font-semibold mt-4">4. Liability Limitations</h4>
              <p>
                YoyoPod is provided "as is" without warranties of any kind. We are not liable for
                any damages arising from the use of this device.
              </p>

              <h4 className="font-semibold mt-4">5. AI Features (if applicable)</h4>
              <p>
                If your device includes AI features, conversations may be logged locally for parental
                review. You can disable this feature in settings.
              </p>

              <h4 className="font-semibold mt-4">6. Terms of Use</h4>
              <p>
                By using this device, you agree to supervise your child's usage and configure
                appropriate parental controls.
              </p>
            </div>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="accept-license" />
              <Button type="submit" className="w-full" size="lg">
                I Accept the License Agreement
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Set Your Password</CardTitle>
            <CardDescription className="text-sm">
              Create a secure password for your {APP_NAME} dashboard
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
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Enter your password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Confirm your password"
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
                  Show password
                </Label>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>Password must:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Be at least 8 characters long</li>
                  <li>Contain uppercase and lowercase letters</li>
                  <li>Contain at least one number</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Complete Setup
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular login
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl sm:text-3xl text-white font-bold">Y</span>
          </div>
          <CardTitle className="text-2xl sm:text-3xl">{APP_NAME}</CardTitle>
          <CardDescription className="text-sm">Parent Dashboard</CardDescription>
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
              <Label htmlFor="username">Username</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
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
                Show password
              </Label>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Sign In
            </Button>
          </Form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Default password: <code className="bg-gray-100 px-2 py-1 rounded">{DEFAULT_PASSWORD}</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

