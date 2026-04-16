import { NextRequest, NextResponse } from "next/server";
import { isDateKey } from "@/lib/date";
import { deleteLog } from "@/lib/logs-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);

  const date = request.nextUrl.searchParams.get("date");

  if (!id || !date || !isDateKey(date)) {
    return NextResponse.json(
      { error: "Missing or invalid log id/date" },
      { status: 400 },
    );
  }

  const deleted = await deleteLog(date, id);

  if (!deleted) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
