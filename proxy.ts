import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight middleware — runs on edge runtime
// Only checks for session cookie, doesn't import NextAuth/Firebase/bcrypt
export function proxy(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;

    // Allow access to login page, API routes, and static files
    if (
      path.startsWith("/login") ||
      path.startsWith("/api") ||
      path.startsWith("/_next") ||
      path.match(/\.(png|svg|ico|js|json|css)$/)
    ) {
      return NextResponse.next();
    }

    // Check for NextAuth v5 session cookie
    // v5 uses "authjs.session-token" (dev) and "__Secure-authjs.session-token" (prod)
    // v4 used "next-auth.session-token" — check both for safety
    const sessionCookie =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value ||
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionCookie) {
      const origin = request.nextUrl.origin;
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.png$|.*\\.svg$|sw\\.js|manifest\\.json|apple-touch-icon\\.png).*)",
  ],
};
