/**
 * Profile Portfolio Tab
 *
 * Manage portfolio/project showcase items.
 */

import { useFetcher } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/profile.portfolio";
import type { PortfolioItem } from "~/lib/profile-types";
import { fetchCurrentUser } from "~/lib/admin-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) return { portfolioItems: [] };

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const headers = { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) };

  const response = await fetch(`${apiUrl}/profile/portfolio`, { headers });
  let portfolioItems: PortfolioItem[] = [];
  if (response.ok) {
    const json = await response.json() as { data: PortfolioItem[] };
    portfolioItems = json.data || [];
  }

  return { portfolioItems };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  if (intent === "addPortfolio") {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const url = formData.get("url") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/portfolio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          title,
          description: description || null,
          url: url || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to add project" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to add portfolio item:", error);
      return { success: false, error: "Failed to add project" };
    }
  }

  if (intent === "deletePortfolio") {
    const itemId = formData.get("itemId") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/portfolio/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      });

      if (!response.ok) {
        return { success: false, error: "Failed to delete project" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to delete portfolio item:", error);
      return { success: false, error: "Failed to delete project" };
    }
  }

  return { success: false };
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-coral hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {new URL(item.url).hostname}
            </a>
          )}
        </div>
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!confirm(`Remove "${item.title}" from your portfolio?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="deletePortfolio" />
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const fetcher = useFetcher();
  const isAdding = fetcher.state !== "idle";

  const actionData = fetcher.data as { success?: boolean } | undefined;
  if (actionData?.success && showForm && !isAdding) {
    setShowForm(false);
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Project
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <fetcher.Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="addPortfolio" />
            <div>
              <label htmlFor="portfolio-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                id="portfolio-title"
                name="title"
                type="text"
                required
                maxLength={200}
                placeholder="My Project"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
            <div>
              <label htmlFor="portfolio-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="portfolio-desc"
                name="description"
                rows={2}
                maxLength={500}
                placeholder="Brief description..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral resize-none"
              />
            </div>
            <div>
              <label htmlFor="portfolio-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <input
                id="portfolio-url"
                name="url"
                type="url"
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add Project"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      ) : !showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showcase your projects. Add your first project to get started.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default function PortfolioTab({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mt-2">
      <PortfolioSection items={loaderData.portfolioItems} />
    </div>
  );
}
