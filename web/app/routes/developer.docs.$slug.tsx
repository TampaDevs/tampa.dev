/**
 * Developer Docs — Slug-based content page
 *
 * Renders the MDX component for the matching doc entry.
 */

import { DOCS_BY_SLUG, DOCS } from "~/content/docs";
import type { Route } from "./+types/developer.docs.$slug";

export function loader({ params }: Route.LoaderArgs) {
  const doc = DOCS_BY_SLUG[params.slug];
  if (!doc) {
    throw new Response("Not Found", { status: 404 });
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
