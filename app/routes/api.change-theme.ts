import { json, type ActionFunctionArgs } from "@remix-run/node";
import { getUserId } from "~/lib/session.server";
import { prisma } from "~/lib/db.server";
import { z } from "zod";

const themeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const userId = await getUserId(request);
  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const theme = formData.get("theme");

    const validation = themeSchema.safeParse({ theme });
    
    if (!validation.success) {
      return json(
        { error: "Invalid theme value" },
        { status: 400 }
      );
    }

    // Update user's theme preference in settings
    await prisma.settings.updateMany({
      where: { userId },
      data: { theme: validation.data.theme },
    });

    return json({ success: true, theme: validation.data.theme });
  } catch (error) {
    console.error("Error updating theme:", error);
    return json(
      { error: "Failed to update theme preference" },
      { status: 500 }
    );
  }
}

