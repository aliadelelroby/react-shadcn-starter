import { createServerFn } from "@tanstack/react-start";
import { getSessionUser } from "~/lib/auth/session";

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  return user || null;
});
