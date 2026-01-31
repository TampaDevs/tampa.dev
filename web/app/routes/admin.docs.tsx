/**
 * Admin Documentation Layout
 *
 * Renders admin-only documentation pages within the admin panel.
 * Auth is handled by the parent admin layout.
 */

import { Link, Outlet, useNavigate, useParams } from "react-router";
import { ADMIN_DOCS } from "~/content/admin-docs";

export default function AdminDocsLayout() {
  const params = useParams();
  const navigate = useNavigate();
  const currentSlug = params.slug || ADMIN_DOCS[0]?.slug;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Documentation
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Internal documentation for admin-restricted features and APIs
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <nav className="hidden lg:block w-48 flex-shrink-0">
          <ul className="space-y-1">
            {ADMIN_DOCS.map((doc) => (
              <li key={doc.slug}>
                <Link
                  to={`/admin/docs/${doc.slug}`}
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
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Mobile Navigation */}
          {ADMIN_DOCS.length > 1 && (
            <div className="lg:hidden mb-6">
              <select
                value={currentSlug}
                onChange={(e) => {
                  navigate(`/admin/docs/${e.target.value}`);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {ADMIN_DOCS.map((doc) => (
                  <option key={doc.slug} value={doc.slug}>{doc.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* MDX Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
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
          </div>
        </div>
      </div>
    </div>
  );
}
