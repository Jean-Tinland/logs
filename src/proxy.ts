import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as Auth from "@/services/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const redirect = request.nextUrl.clone();
  redirect.pathname = "/login";

  if (!token) {
    return NextResponse.redirect(redirect);
  }

  try {
    Auth.checkToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(redirect);
  }
}

export const config = {
  matcher: ["/((?!api|login|images|_next/static|_next/image|favicon.ico).*)"],
};
