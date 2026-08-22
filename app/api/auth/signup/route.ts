import { NextResponse } from "next/server";
import { addUser, findUserByEmail } from "@/lib/store";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// New sign-ups get the Staff role (view + upload); role changes are a
// seed-data concern, not a UI feature.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { name, email, password } = body ?? {};
  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email) ||
    typeof password !== "string" || password.length < 6
  ) {
    return NextResponse.json(
      { error: "name, valid email and a password of 6+ characters are required" },
      { status: 400 }
    );
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json({ error: "an account with that email already exists" }, { status: 409 });
  }
  const user = await addUser({
    name: name.trim(),
    title: "Staff",
    email: email.trim(),
    password_hash: hashPassword(password),
  });
  const res = NextResponse.json(
    { user: { id: user.id, name: user.name, title: user.title, email: user.email, role: user.role } },
    { status: 201 }
  );
  res.cookies.set(SESSION_COOKIE, signSession(user.id), sessionCookieOptions);
  return res;
}
