/**
 * Admin Docs - Slug-based content page
 *
 * Renders the MDX component for the matching admin doc entry.
 */

import { ADMIN_DOCS_BY_SLUG } from "~/content/admin-docs";
import type { Route } from "./+types/admin.docs.$slug";

export function loader({ params }: Route.LoaderArgs) {
  const doc = ADMIN_DOCS_BY_SLUG[params.slug];
  if (!doc) {
    throw new Response("Not Found", { status: 404 });
  }
  return { slug: params.slug, title: doc.title, description: doc.description };
}

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data) return [];
  return [
    { title: `${data.title} | Tampa.dev Admin` },
    { name: "description", content: data.description },
  ];
};

export default function AdminDocsPage({ loaderData }: Route.ComponentProps) {
  const doc = ADMIN_DOCS_BY_SLUG[loaderData.slug];
  if (!doc) return null;

  const Content = doc.component;
  return <Content />;
}
