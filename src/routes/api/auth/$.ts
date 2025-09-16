import { createServerFileRoute } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/lib/db";
import { account, user as userTable } from "~/lib/db/schema";
import { createSession, destroySession, getSessionUser } from "~/lib/auth/session";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ServerRoute = createServerFileRoute("/api/auth/$").methods({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "me") {
      const user = await getSessionUser();
      return Response.json(user);
    }

    return new Response("Not Found", { status: 404 });
  },
  POST: async ({ request }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "signup") {
      const body = await request.json();
      const parsed = signupSchema.safeParse(body);
      if (!parsed.success) return new Response("Invalid input", { status: 400 });
      const { name, email, password } = parsed.data;

      const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
      if (existing) return new Response("Email already in use", { status: 409 });

      const id = crypto.randomUUID();
      await db.insert(userTable).values({ id, name, email });
      await db.insert(account).values({ id: crypto.randomUUID(), userId: id, providerId: "credentials", accountId: email, password });

      const sessionResult = await createSession(id, request.headers.get("user-agent"), request.headers.get("x-forwarded-for"));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": sessionResult.cookie,
        },
      });
    }

    if (action === "login") {
      const body = await request.json();
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return new Response("Invalid input", { status: 400 });
      const { email, password } = parsed.data;

      const row = await db
        .select({ id: userTable.id })
        .from(userTable)
        .leftJoin(account, and(eq(account.userId, userTable.id), eq(account.providerId, "credentials")))
        .where(and(eq(userTable.email, email), eq(account.password, password)));

      const user = row?.[0];
      if (!user) return new Response("Invalid credentials", { status: 401 });

      const sessionResult = await createSession(user.id, request.headers.get("user-agent"), request.headers.get("x-forwarded-for"));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": sessionResult.cookie,
        },
      });
    }

    if (action === "logout") {
      const sessionResult = await destroySession();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": sessionResult.cookie,
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});
