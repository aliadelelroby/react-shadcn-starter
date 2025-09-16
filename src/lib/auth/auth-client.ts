import { env } from "~/env/client";

function getBaseUrl() {
  // Use environment variable if set, otherwise use current origin
  if (env.VITE_BASE_URL && env.VITE_BASE_URL !== "http://localhost:3000") {
    return env.VITE_BASE_URL;
  }
  // Fallback to current origin for dynamic environments
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side fallback
  return env.VITE_BASE_URL;
}

async function request<T>(url: string, init?: RequestInit) {
  console.log("Making request to:", url, "with options:", init);
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  console.log("Response status:", res.status, "headers:", Object.fromEntries(res.headers.entries()));
  if (!res.ok) {
    const text = await res.text();
    console.log("Request failed with error:", text);
    throw new Error(text || "Request failed");
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    console.log("Response data:", data);
    return data as T;
  }
  return undefined as unknown as T;
}

export const AuthClient = {
  async signup(params: { name: string; email: string; password: string }) {
    return request<{ ok: boolean }>(`${getBaseUrl()}/api/auth/?action=signup`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async login(params: { email: string; password: string }) {
    return request<{ ok: boolean }>(`${getBaseUrl()}/api/auth/?action=login`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async logout() {
    return request<{ ok: boolean }>(`${getBaseUrl()}/api/auth/?action=logout`, { method: "POST" });
  },
  async me() {
    return request<{ id: string; name: string; email: string; image: string | null } | null>(
      `${getBaseUrl()}/api/auth/?action=me`,
      { method: "GET" },
    );
  },
};

export default AuthClient;
