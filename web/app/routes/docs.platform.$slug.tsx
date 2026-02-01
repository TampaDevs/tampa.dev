/**
 * Platform Docs - Slug-based content page
 *
 * Renders the MDX component for the matching platform doc entry.
 */

import { PLATFORM_DOCS_BY_SLUG } from "~/content/platform-docs";
import type { Route } from "./+types/docs.platform.$slug";
import { generateMetaTags } from "~/lib/seo";

export function loader({ params }: Route.LoaderArgs) {
  const doc = PLATFORM_DOCS_BY_SLUG[params.slug];
  if (!doc) {
    throw new Response("Not Found", { status: 404 });
  }
  return { slug: params.slug, title: doc.title, description: doc.description };
}

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data) return [];
  return generateMetaTags({
    title: `${data.title} | Platform Guide`,
    description: data.description,
    url: `/docs/platform/${data.slug}`,
  });
};

export default function PlatformDocsPage({ loaderData }: Route.ComponentProps) {
  const doc = PLATFORM_DOCS_BY_SLUG[loaderData.slug];
  if (!doc) return null;

  const Content = doc.component;
  return <Content />;
}
