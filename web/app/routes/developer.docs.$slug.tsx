/**
 * Developer Docs - Slug-based content page
 *
 * Renders the MDX component for the matching doc entry.
 * Admin-gated docs return 404 for non-admin users.
 */

import { DOCS_BY_SLUG } from "~/content/docs";
import { fetchCurrentUser } from "~/lib/api.server";
import type { Route } from "./+types/developer.docs.$slug";

export async function loader({ params, request }: Route.LoaderArgs) {
  const doc = DOCS_BY_SLUG[params.slug];
  if (!doc) {
    throw new Response("Not Found", { status: 404 });
  }

  // Admin-gated docs: check user role
  if (doc.admin) {
    const cookieHeader = request.headers.get("Cookie") || undefined;
    const user = await fetchCurrentUser(cookieHeader);
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    if (!isAdmin) {
      throw new Response("Not Found", { status: 404 });
    }
  }

  return { slug: params.slug, title: doc.title, description: doc.description };
}

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data) return [];
  return [
    { title: `${data.title} | Tampa.dev API Docs` },
    { name: "description", content: data.description },
  ];
};

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const doc = DOCS_BY_SLUG[loaderData.slug];
  if (!doc) return null;

  const Content = doc.component;
  return <Content />;
}
