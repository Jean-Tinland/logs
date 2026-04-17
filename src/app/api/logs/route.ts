import { NextRequest, NextResponse } from "next/server";
import { createLog, getGroupedLogs } from "@/lib/logs-repository";
import { LOG_KINDS, type LogKind } from "@/types/log";
import * as Auth from "@/services/auth";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 200;
const MAX_LOG_CONTENT_LENGTH = 20000;

function parseKinds(rawKinds: string | null): LogKind[] | undefined {
  if (!rawKinds) return undefined;
  const parsed = rawKinds
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is LogKind => LOG_KINDS.includes(part as LogKind));
  return parsed.length ? parsed : undefined;
}

export const GET = async (request: NextRequest) => {
  try {
    Auth.checkRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q") || undefined;
    if (search && search.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Search query is too long (max ${MAX_QUERY_LENGTH})` },
        { status: 400 },
      );
    }

    const windowDays = Number(searchParams.get("days"));
    const payload = await getGroupedLogs({
      reference: searchParams.get("reference") || undefined,
      windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
      search,
      kinds: parseKinds(searchParams.get("kinds")),
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Auth.AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Could not read logs" }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    Auth.checkRequest(request);

    const body = (await request.json().catch(() => null)) as {
      kind?: unknown;
      content?: unknown;
    } | null;

    const kind = typeof body?.kind === "string" ? body.kind : "normal";
    const content = typeof body?.content === "string" ? body.content : "";

    if (!LOG_KINDS.includes(kind as LogKind)) {
      return NextResponse.json({ error: "Invalid log kind" }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Log content cannot be empty" },
        { status: 400 },
      );
    }

    if (content.length > MAX_LOG_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          error: `Log content is too long (max ${MAX_LOG_CONTENT_LENGTH} characters)`,
        },
        { status: 413 },
      );
    }

    const log = await createLog(kind as LogKind, content);
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof Auth.AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Could not create log" },
      { status: 500 },
    );
  }
};
