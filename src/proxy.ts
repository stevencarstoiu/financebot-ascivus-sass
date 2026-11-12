import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/app/:path*",
    "/onboarding",
    "/login",
    "/signup",
    "/verify-email",
    "/reset-password",
    "/auth/:path*",
    "/api/:path*",
  ],
};
