import { cookies } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { db } from "~/lib/db";
import { session, user as userTable } from "~/lib/db/schema";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_DAYS = 7;

export async function createSession(userId: string, userAgent?: string | null, ipAddress?: string | null) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = addDays(new Date(), SESSION_DAYS);

  await db.insert(session).values({
    id: token,
    token,
    userId,
    expiresAt,
    userAgent: userAgent ?? undefined,
    ipAddress: ipAddress ?? undefined,
  });

  const cookie = await cookies();
  cookie.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookie = await cookies();
  const token = cookie.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(session).where(eq(session.token, token));
    cookie.set(SESSION_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  }
}

export async function getSessionUser() {
  const cookie = await cookies();
  const token = cookie.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(session)
    .leftJoin(userTable, eq(userTable.id, session.userId))
    .where(eq(session.token, token));

  return row ?? null;
}
