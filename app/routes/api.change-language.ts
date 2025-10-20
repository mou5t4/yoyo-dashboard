import { type ActionFunctionArgs, redirect } from "@remix-run/node";
import { prisma } from "~/lib/db.server";
import { getUserId } from "~/lib/session.server";
import { supportedLanguages } from "~/i18n";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return redirect("/");
  }

  const formData = await request.formData();
  const language = formData.get("language") as string;

  // Validate language
  if (!language || !(language in supportedLanguages)) {
    return redirect(request.headers.get("Referer") || "/dashboard");
  }

  // Update user's language setting
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (user?.settings) {
    await prisma.settings.update({
      where: { id: user.settings.id },
      data: { language },
    });
  }

  // Redirect back to the current page
  const referer = request.headers.get("Referer") || "/dashboard";
  return redirect(referer);
}


