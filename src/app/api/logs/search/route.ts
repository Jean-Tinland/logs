import { NextRequest, NextResponse } from "next/server";
import { searchLogs } from "@/lib/logs-repository";
import { LOG_KINDS, type LogKind } from "@/types/log";
import * as Auth from "@/services/auth";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 200;

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
    const query = searchParams.get("q") || undefined;
    if (query && query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Search query is too long (max ${MAX_QUERY_LENGTH})` },
        { status: 400 },
      );
    }

    const offset = Number(searchParams.get("offset"));
    const limit = Number(searchParams.get("limit"));
    const payload = await searchLogs({
      query,
      kinds: parseKinds(searchParams.get("kinds")),
      offset: Number.isFinite(offset) ? offset : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
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

    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
};
