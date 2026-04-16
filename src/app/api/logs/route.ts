import { NextRequest, NextResponse } from "next/server";
import { createLog, getGroupedLogs } from "@/lib/logs-repository";
import { LOG_KINDS, type LogKind } from "@/types/log";

export const runtime = "nodejs";

function parseKinds(rawKinds: string | null): LogKind[] | undefined {
  if (!rawKinds) return undefined;
  const parsed = rawKinds
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is LogKind => LOG_KINDS.includes(part as LogKind));
  return parsed.length ? parsed : undefined;
}

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const windowDays = Number(searchParams.get("days"));
  const payload = await getGroupedLogs({
    reference: searchParams.get("reference") || undefined,
    windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
    search: searchParams.get("q") || undefined,
    kinds: parseKinds(searchParams.get("kinds")),
  });
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const kind = typeof body.kind === "string" ? body.kind : "normal";
    const content = typeof body.content === "string" ? body.content : "";

    if (!LOG_KINDS.includes(kind as LogKind)) {
      return NextResponse.json({ error: "Invalid log kind" }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Log content cannot be empty" },
        { status: 400 },
      );
    }

    const log = await createLog(kind as LogKind, content);
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create log",
      },
      { status: 500 },
    );
  }
};
