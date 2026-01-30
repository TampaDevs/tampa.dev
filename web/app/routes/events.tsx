import { redirect } from "react-router";
import type { Route } from "./+types/events";

/**
 * Redirect /events to /calendar?view=list
 * Preserves any existing filter query params.
 * /events/:id is handled by events.$id.tsx and remains unchanged.
 */
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const params = new URLSearchParams();
  params.set("view", "list");

  const type = url.searchParams.get("type");
  if (type) params.set("type", type);

  const groups = url.searchParams.get("groups");
  if (groups) params.set("groups", groups);

  return redirect(`/calendar?${params}`);
}

export default function Events() {
  return null;
}
