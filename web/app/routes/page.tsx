/**
 * SEO Landing Page renderer
 *
 * Serves all pages registered in content/pages/index.ts.
 * Each page gets its own top-level URL (e.g., /tampa-bay-tech-events).
 * The slug is derived from the request URL pathname.
 */

import { Link, useLoaderData } from "react-router";
import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { PAGES_BY_SLUG, type FAQEntry } from "~/content/pages";
import { generateMetaTags, type MetaDescriptor } from "~/lib/seo";
import { faqPageJsonLd, type FAQItem } from "~/lib/structured-data";
import { StructuredData } from "~/components";

interface LoaderData {
  slug: string;
  title: string;
  description: string;
  h1: string;
  faqs: FAQEntry[];
  groupsTag: string | null;
  calendarFilter: string | null;
}

export function loader({ request }: LoaderFunctionArgs): LoaderData {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\//, "");
  const page = PAGES_BY_SLUG[slug];

  if (!page) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    slug,
    title: page.title,
    description: page.description,
    h1: page.h1,
    faqs: page.faqs,
    groupsTag: page.groupsTag,
    calendarFilter: page.calendarFilter,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [] as MetaDescriptor[];
  return generateMetaTags({
    title: data.title,
    description: data.description,
    url: `/${data.slug}`,
  });
};

export default function SEOPage() {
  const { slug, h1, faqs, groupsTag, calendarFilter } = useLoaderData<LoaderData>();
  const page = PAGES_BY_SLUG[slug];
  if (!page) return null;

  const Content = page.component;
  const faqItems: FAQItem[] = faqs.map((f: FAQEntry) => ({
    question: f.q,
    answer: f.a,
  }));

  const calendarLink = calendarFilter
    ? `/calendar?${calendarFilter}`
    : "/calendar";

  const groupsLink = groupsTag
    ? `/groups?tag=${encodeURIComponent(groupsTag)}`
    : "/groups";

  return (
    <>
      {faqItems.length > 0 && <StructuredData data={faqPageJsonLd(faqItems)} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
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

        {/* FAQ Section */}
        {faqItems.length > 0 && (
          <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqItems.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Last Updated + CTA */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Last updated: {new Date().toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={calendarLink}
              className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors"
            >
              Browse the Calendar
            </Link>
            <Link
              to={groupsLink}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Explore Groups
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
