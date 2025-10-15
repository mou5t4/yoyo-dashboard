import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { getUserId, getUser } from "~/lib/auth.server";
import { useIsMobile } from "~/hooks/useMediaQuery";
import { MobileLayout } from "~/components/layouts/MobileLayout";
import { DesktopLayout } from "~/components/layouts/DesktopLayout";
import { type SupportedLanguage } from "~/i18n";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return redirect("/");
  }

  const user = await getUser(userId);
  
  if (!user) {
    return redirect("/");
  }

  const language = (user.settings?.language || "en") as SupportedLanguage;

  return json({ user, language });
}

export default function AuthLayout() {
  const { user, language } = useLoaderData<typeof loader>();
  const isMobile = useIsMobile();

  // Use conditional rendering based on screen size
  if (isMobile) {
    return (
      <MobileLayout language={language}>
        <Outlet />
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout language={language}>
      <Outlet />
    </DesktopLayout>
  );
}