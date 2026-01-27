/**
 * SEO utilities for generating meta tags
 */

const SITE_NAME = "Tampa Tech Events";
const SITE_URL = "https://tampa.dev";
const DEFAULT_DESCRIPTION =
  "Discover tech meetups, developer events, and communities in Tampa Bay. Find your next networking opportunity.";
const DEFAULT_IMAGE = "/images/hero.webp";

interface MetaTagsOptions {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "event";
  noIndex?: boolean;
}

// Meta descriptor types supported by React Router
export type MetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { tagName: "link"; rel: string; href: string; type?: string; title?: string };

/**
 * Generate standard meta tags for a page
 */
export function generateMetaTags({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noIndex = false,
}: MetaTagsOptions): MetaDescriptor[] {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const fullImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  const tags: MetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: description },

    // Open Graph
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: fullImage },
    { property: "og:url", content: fullUrl },
    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },

    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: fullImage },
  ];

  if (noIndex) {
    tags.push({ name: "robots", content: "noindex, nofollow" });
  }

  return tags;
}

/**
 * Generate canonical link
 */
export function generateCanonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
