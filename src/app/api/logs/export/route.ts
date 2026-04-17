import { NextRequest, NextResponse } from "next/server";
import { getAllLogsNewestFirst } from "@/lib/file-logs-repository";
import * as Auth from "@/services/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    Auth.checkRequest(request);

    const logs = await getAllLogsNewestFirst();
    const exportedAt = new Date().toISOString();
    const filenameDate = exportedAt.slice(0, 10);

    return NextResponse.json(
      {
        exportedAt,
        count: logs.length,
        logs,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename=logs-${filenameDate}.json`,
        },
      },
    );
  } catch (error) {
    if (error instanceof Auth.AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
