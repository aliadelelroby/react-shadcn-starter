import { getCookie, setCookie } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { db } from "~/lib/db";
import { account, session, user as userTable } from "~/lib/db/schema";

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

  setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60, // Convert days to seconds
  });

  return { success: true };
}

export async function destroySession() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (token) {
    await db.delete(session).where(eq(session.token, token));
  }
  
  setCookie(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });

  return { success: true };
}

export async function getSessionUser() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) return null;

  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(session)
    .leftJoin(userTable, eq(userTable.id, session.userId))
    .where(eq(session.token, token));

  return rows[0] ?? null;
}

export async function verifyCredentials(email: string, password: string) {
  const row = await db
    .select({ id: userTable.id })
    .from(userTable)
    .leftJoin(account, and(eq(account.userId, userTable.id), eq(account.providerId, "credentials")))
    .where(and(eq(userTable.email, email), eq(account.password, password)));
  return row[0]?.id ?? null;
}
