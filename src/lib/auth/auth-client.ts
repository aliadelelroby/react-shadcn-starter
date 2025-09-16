import { env } from "~/env/client";

async function request<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await res.json()) as T;
  return undefined as unknown as T;
}

export const AuthClient = {
  async signup(params: { name: string; email: string; password: string }) {
    return request<{ ok: boolean }>(`${env.VITE_BASE_URL}/api/auth/?action=signup`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async login(params: { email: string; password: string }) {
    return request<{ ok: boolean }>(`${env.VITE_BASE_URL}/api/auth/?action=login`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async logout() {
    return request<{ ok: boolean }>(`${env.VITE_BASE_URL}/api/auth/?action=logout`, { method: "POST" });
  },
  async me() {
    return request<{ id: string; name: string; email: string; image: string | null } | null>(
      `${env.VITE_BASE_URL}/api/auth/?action=me`,
      { method: "GET" },
    );
  },
};

export default AuthClient;
