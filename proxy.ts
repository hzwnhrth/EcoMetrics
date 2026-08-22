import { NextResponse, type NextRequest } from "next/server";

// Route guard (QA item 5): unauthenticated users cannot reach any page —
// redirect to /login. APIs answer 401 JSON instead of redirecting.
// Session verification duplicates lib/auth.ts's HMAC with Web Crypto so it
// runs in any proxy runtime.

const SESSION_COOKIE = "ecometrics_session";

function isPublic(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/reminders") || // cron endpoint guards itself via CRON_SECRET
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname) // static assets
  );
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const secret = process.env.AUTH_SECRET || "ecometrics-demo-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  if (b64url(mac) !== sig) return false;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { uid, exp } = JSON.parse(json);
    return typeof uid === "string" && typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await sessionValid(req.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic(pathname)) {
    // already signed in — skip the login screen
    if (pathname === "/login" && authed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("from", pathname);
  return NextResponse.redirect(login);
}

// Both config names as static literals — Next reads whichever this version
// supports; the unused one is inert.
export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
