/**
 * Development Auth Bypass
 *
 * Automatically creates a session for a dev user without going through GitHub OAuth.
 * Only available in development mode.
 */

import { redirect } from "react-router";
import type { Route } from "./+types/_dev.auth";

export async function loader({ request }: Route.LoaderArgs) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    throw redirect("/");
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  const role = url.searchParams.get("role") || "admin"; // admin, user, superadmin

  // Call the dev auth endpoint on the API
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://events.api.tampa.dev";

  try {
    const response = await fetch(`${apiUrl}/auth/dev`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Dev auth failed:", error);
      throw redirect(`/login?error=dev_auth_failed`);
    }

    const data = await response.json() as { sessionToken: string };

    // Create response with session cookie
    const headers = new Headers();
    headers.set(
      "Set-Cookie",
      `session=${data.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );
    headers.set("Location", returnTo);

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error("Dev auth error:", error);
    throw redirect(`/login?error=dev_auth_failed`);
  }
}

export default function DevAuthPage() {
  // This shouldn't render - loader always redirects
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
