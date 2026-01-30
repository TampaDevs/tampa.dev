/**
 * Logout Route
 *
 * Handles POST requests to log out the current user.
 * Calls the API to clear the session and redirects to home.
 */

import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { logout } from "~/lib/admin-api.server";

// Redirect GET requests to home (don't allow GET logout - CSRF risk)
export function loader() {
  return redirect("/");
}

// Handle POST request (form-based logout)
export async function action({ request }: Route.ActionArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  await logout(cookieHeader);

  // Redirect to home page after logout
  // Clear both possible session cookie names (prod + staging)
  // so sessions don't linger when switching environments.
  const clearCookies = [
    "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Domain=.tampa.dev",
    "session_staging=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Domain=.tampa.dev",
  ];
  return redirect("/", {
    headers: [
      ["Set-Cookie", clearCookies[0]],
      ["Set-Cookie", clearCookies[1]],
    ],
  });
}
