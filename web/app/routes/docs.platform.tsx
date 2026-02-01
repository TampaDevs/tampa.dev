/**
 * Platform Guide Documentation Layout
 *
 * Provides the sidebar navigation and chrome for all platform docs pages.
 * Child routes render individual MDX content pages via <Outlet />.
 */

import { Link, Outlet, useNavigate, useParams } from "react-router";
import { PLATFORM_DOCS, PLATFORM_CATEGORIES } from "~/content/platform-docs";
import type { Route } from "./+types/docs.platform";
import { generateMetaTags } from "~/lib/seo";

export const meta: Route.MetaFunction = () => generateMetaTags({
  title: "Platform Guide",
  description: "Learn how to use Tampa.dev — profiles, groups, events, badges, and community features.",
  url: "/docs/platform",
});

export default function PlatformDocsLayout() {
  const params = useParams();
  const navigate = useNavigate();
  const currentSlug = params.slug || PLATFORM_DOCS[0]?.slug;

  // Group docs by category
  const docsByCategory = PLATFORM_CATEGORIES.map((category) => ({
    category,
    docs: PLATFORM_DOCS.filter((d) => d.category === category),
  })).filter((group) => group.docs.length > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/docs" className="text-sm text-coral hover:underline mb-2 inline-block">
          &larr; Back to Docs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Guide</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Learn how to use Tampa.dev — profiles, groups, events, badges, and community features.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <nav className="hidden lg:block w-48 flex-shrink-0 sticky top-20 self-start">
          <ul className="space-y-4">
            {docsByCategory.map(({ category, docs }) => (
              <li key={category}>
                <span className="block px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {category}
                </span>
                <ul className="mt-1 space-y-1">
                  {docs.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        to={`/docs/platform/${doc.slug}`}
                        className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          currentSlug === doc.slug
                            ? "bg-coral/10 text-coral font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:text-coral dark:hover:text-coral hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        {doc.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-6">
            <select
              value={currentSlug}
              onChange={(e) => {
                navigate(`/docs/platform/${e.target.value}`);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              {docsByCategory.map(({ category, docs }) => (
                <optgroup key={category} label={category}>
                  {docs.map((doc) => (
                    <option key={doc.slug} value={doc.slug}>{doc.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* MDX Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none
            prose-headings:font-semibold
            prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:dark:border-gray-700 prose-h1:pb-2 prose-h1:mb-4
            prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-base prose-h3:mt-6
            prose-code:text-xs prose-code:bg-gray-100 prose-code:dark:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg
            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:text-sm
            prose-table:text-sm prose-th:text-left prose-th:px-4 prose-th:py-2 prose-th:font-medium prose-th:bg-gray-50 prose-th:dark:bg-gray-800
            prose-td:px-4 prose-td:py-2
            prose-a:text-coral prose-a:no-underline hover:prose-a:underline
            prose-li:my-0.5
            text-sm text-gray-700 dark:text-gray-300
          ">
            <Outlet />
          </div>

          {/* Prev/Next Navigation */}
          <PlatformDocsNavigation currentSlug={currentSlug || ''} />
        </div>
      </div>
    </div>
  );
}

function PlatformDocsNavigation({ currentSlug }: { currentSlug: string }) {
  const currentIndex = PLATFORM_DOCS.findIndex((d) => d.slug === currentSlug);
  const prev = currentIndex > 0 ? PLATFORM_DOCS[currentIndex - 1] : null;
  const next = currentIndex < PLATFORM_DOCS.length - 1 ? PLATFORM_DOCS[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
      {prev ? (
        <Link
          to={`/docs/platform/${prev.slug}`}
          className="group text-sm"
        >
          <span className="text-gray-500 dark:text-gray-400 group-hover:text-coral transition-colors">
            &larr; Previous
          </span>
          <span className="block font-medium text-gray-900 dark:text-white group-hover:text-coral transition-colors">
            {prev.title}
          </span>
        </Link>
      ) : <div />}
      {next ? (
        <Link
          to={`/docs/platform/${next.slug}`}
          className="group text-sm text-right"
        >
          <span className="text-gray-500 dark:text-gray-400 group-hover:text-coral transition-colors">
            Next &rarr;
          </span>
          <span className="block font-medium text-gray-900 dark:text-white group-hover:text-coral transition-colors">
            {next.title}
          </span>
        </Link>
      ) : <div />}
    </div>
  );
}
