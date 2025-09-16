import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { getSessionUser } from "~/lib/auth/session";

// https://tanstack.com/start/latest/docs/framework/react/middleware
// This is a sample middleware that you can use in your server functions.

/**
 * Middleware to force authentication on a server function, and add the user to the context.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await getSessionUser();
    if (!user) {
      setResponseStatus(401);
      throw new Error("Unauthorized");
    }
    return next({ context: { user } });
  },
);
