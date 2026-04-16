import { NextResponse } from "next/server";
import { getAllLogsNewestFirst } from "@/lib/file-logs-repository";

export const runtime = "nodejs";

export async function GET() {
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
}
