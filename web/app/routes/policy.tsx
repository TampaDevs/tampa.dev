/**
 * Policy Page renderer
 *
 * Serves policy pages registered in content/policies/index.ts.
 * Each page gets a /policies/:slug URL (e.g., /policies/privacy).
 */

import { Link, useLoaderData } from "react-router";
import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { POLICIES_BY_SLUG } from "~/content/policies";
import { generateMetaTags, type MetaDescriptor } from "~/lib/seo";

interface LoaderData {
  slug: string;
  title: string;
  description: string;
  h1: string;
}

export function loader({ request }: LoaderFunctionArgs): LoaderData {
  const url = new URL(request.url);
  // Extract slug from /policies/:slug
  const parts = url.pathname.replace(/^\//, "").split("/");
  const slug = parts[1] || "";
  const page = POLICIES_BY_SLUG[slug];

  if (!page) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    slug,
    title: page.title,
    description: page.description,
    h1: page.h1,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [] as MetaDescriptor[];
  return generateMetaTags({
    title: data.title,
    description: data.description,
    url: `/policies/${data.slug}`,
  });
};

export default function PolicyPage() {
  const { slug, h1 } = useLoaderData<LoaderData>();
  const page = POLICIES_BY_SLUG[slug];
  if (!page) return null;

  const Content = page.component;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-coral">
          Tampa.dev
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white">{h1}</span>
      </nav>

      {/* H1 */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
        {h1}
      </h1>

      {/* MDX Content */}
      <div className="prose prose-gray dark:prose-invert max-w-none
        prose-headings:font-semibold
        prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-6
        prose-p:leading-relaxed
        prose-li:my-0.5
        prose-a:text-coral prose-a:no-underline hover:prose-a:underline
        prose-strong:text-gray-900 dark:prose-strong:text-white
        text-gray-700 dark:text-gray-300
      ">
        <Content />
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Last updated: {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
