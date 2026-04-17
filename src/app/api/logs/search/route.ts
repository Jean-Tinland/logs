import { NextRequest, NextResponse } from "next/server";
import { searchLogs } from "@/lib/logs-repository";
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
  const offset = Number(searchParams.get("offset"));
  const limit = Number(searchParams.get("limit"));
  const payload = await searchLogs({
    query: searchParams.get("q") || undefined,
    kinds: parseKinds(searchParams.get("kinds")),
    offset: Number.isFinite(offset) ? offset : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
};
