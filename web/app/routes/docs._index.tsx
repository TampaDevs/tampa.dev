/**
 * Docs Hub Page
 *
 * Public landing page linking to all documentation sites.
 */

import { Link } from "react-router";
import type { Route } from "./+types/docs._index";

export const meta: Route.MetaFunction = () => [
  { title: "Documentation | Tampa.dev" },
  { name: "description", content: "Tampa.dev documentation hub. Developer API reference, platform guides, and more." },
];

const DOC_SITES = [
  {
    title: "Developer Docs",
    description: "API reference, OAuth 2.1 authentication, scopes, webhooks, and Personal Access Tokens for building integrations.",
    to: "/developer/docs",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: "Platform Guide",
    description: "Learn how to use Tampa.dev — profiles, groups, events, badges, and community features.",
    to: "/docs/platform",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
] as const;

export default function DocsHub() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Documentation</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Everything you need to use and build on Tampa.dev.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {DOC_SITES.map((site) => (
          <Link
            key={site.to}
            to={site.to}
            className="group block p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-coral dark:hover:border-coral transition-colors"
          >
            <div className="text-coral mb-4">{site.icon}</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-coral transition-colors">
              {site.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {site.description}
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-coral">
              Browse docs &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
