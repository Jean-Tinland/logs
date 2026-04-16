import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json({ error: "Missing password" }, { status: 401 });
  }

  const pwd = process.env.PASSWORD;
  if (!pwd) {
    return NextResponse.json(
      { error: "Missing PASSWORD config" },
      { status: 500 },
    );
  }

  if (password !== pwd) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing JWT_SECRET config" },
      { status: 500 },
    );
  }

  const durationDays = Number(process.env.JWT_DURATION ?? "90");
  const expiresIn =
    Number.isFinite(durationDays) && durationDays > 0
      ? Math.trunc(durationDays * 24 * 60 * 60)
      : 90 * 24 * 60 * 60;

  const token = jwt.sign({}, secret, { expiresIn });

  return NextResponse.json({ token });
}
