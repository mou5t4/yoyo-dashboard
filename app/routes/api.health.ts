import { json } from "@remix-run/node";
import { prisma } from "~/lib/db.server";

export async function loader() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const databaseStatus = { status: "ok" };
    const memoryUsage = process.memoryUsage();

    const checks = {
      database: databaseStatus,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
      },
      uptime: Math.round(process.uptime()) + "s",
      nodeVersion: process.version,
    };

    const healthy = databaseStatus.status === "ok";

    return json(
      {
        healthy,
        timestamp: new Date().toISOString(),
        checks,
      },
      {
        status: healthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error) {
    return json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

