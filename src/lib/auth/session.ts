import { getWebRequest, getWebResponse } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { db } from "~/lib/db";
import { account, session, user as userTable } from "~/lib/db/schema";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_DAYS = 7;

function parseCookie(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    result[k] = decodeURIComponent(rest.join("="));
  }
  return result;
}

function serializeCookie(name: string, value: string, opts: { expires?: Date; path?: string; httpOnly?: boolean; sameSite?: "lax" | "strict" | "none"; secure?: boolean } = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (opts.expires) segments.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.path) segments.push(`Path=${opts.path}`);
  if (opts.httpOnly) segments.push("HttpOnly");
  if (opts.sameSite) segments.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) segments.push("Secure");
  return segments.join("; ");
}

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

  const res = getWebResponse();
  res.headers.append(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    }),
  );
}

export async function destroySession() {
  const req = getWebRequest();
  const cookies = parseCookie(req.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    await db.delete(session).where(eq(session.token, token));
  }
  const res = getWebResponse();
  res.headers.append(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE_NAME, "", { path: "/", expires: new Date(0) }),
  );
}

export async function getSessionUser() {
  const req = getWebRequest();
  const cookies = parseCookie(req.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE_NAME];
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
