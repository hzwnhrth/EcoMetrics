import { NextResponse } from "next/server";
import { findUserByEmail, findUserById } from "@/lib/store";
import { checkPassword } from "@/lib/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

function publicUser(u: User) {
  return { id: u.id, name: u.name, title: u.title, email: u.email, role: u.role };
}

// Two paths: {email, password} for real credentials, or {demo_user_id} —
// one-click sign-in from the login screen's demo picker, allowed only for
// seeded demo accounts (QA: "judging doesn't need typed credentials").
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { email, password, demo_user_id } = body ?? {};

  let user: User | null = null;
  if (typeof demo_user_id === "string") {
    const candidate = await findUserById(demo_user_id);
    if (candidate?.demo) user = candidate;
  } else if (typeof email === "string" && typeof password === "string") {
    const candidate = await findUserByEmail(email);
    if (candidate && checkPassword(password, candidate.password_hash)) user = candidate;
  }

  if (!user) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  const res = NextResponse.json({ user: publicUser(user) });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), sessionCookieOptions);
  return res;
}
