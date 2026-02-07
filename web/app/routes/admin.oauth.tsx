/**
 * Admin OAuth Clients Management Page
 *
 * View and manage OAuth clients registered with "Sign in with Tampa.dev"
 */

import { useLoaderData, useFetcher } from "react-router";
import type { Route } from "./+types/admin.oauth";
import {
  fetchOAuthClients,
  fetchOAuthStats,
  deleteOAuthClient,
  type OAuthClient,
} from "~/lib/admin-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const [clientsData, stats] = await Promise.all([
    fetchOAuthClients(cookieHeader),
    fetchOAuthStats(cookieHeader),
  ]);

  return { clients: clientsData.clients, stats };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const clientId = formData.get("clientId") as string;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "delete") {
    const result = await deleteOAuthClient(clientId, cookieHeader);
    return { success: true, ...result };
  }

  return { success: false, error: "Unknown action" };
}

function ClientRow({ client }: { client: OAuthClient }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {client.logoUri ? (
            <img
              src={client.logoUri}
              alt={client.clientName}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {client.clientName}
            </div>
            {client.clientUri && (
              <a
                href={client.clientUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-coral hover:underline"
              >
                {new URL(client.clientUri).hostname}
              </a>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
          {client.clientId.length > 20
            ? `${client.clientId.slice(0, 20)}...`
            : client.clientId}
        </code>
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="max-w-xs">
          {client.redirectUris.slice(0, 2).map((uri, i) => (
            <div key={i} className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {uri}
            </div>
          ))}
          {client.redirectUris.length > 2 && (
            <div className="text-sm text-gray-400">
              +{client.redirectUris.length - 2} more
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-4 hidden lg:table-cell">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {client.registrationDate
            ? new Date(client.registrationDate).toLocaleDateString()
            : "-"}
        </span>
      </td>
      <td className="px-4 py-4">
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (
              !confirm(
                `Are you sure you want to delete "${client.clientName}"? This will revoke all grants and tokens for this client.`
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="clientId" value={client.clientId} />
          <button
            type="submit"
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
            title="Delete client"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </fetcher.Form>
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "gray",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "coral" | "green" | "blue" | "gray";
}) {
  const colorClasses = {
    coral: "text-coral",
    green: "text-green-500",
    blue: "text-blue-500",
    gray: "text-gray-600 dark:text-gray-300",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOAuthPage() {
  const { clients, stats } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          OAuth Clients
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage third-party apps using "Sign in with Tampa.dev"
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Clients"
          value={stats.clients}
          color="coral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          }
        />
        <StatCard
          label="Active Grants"
          value={stats.grants}
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          label="Active Tokens"
          value={stats.activeTokens}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Codes"
          value={stats.pendingCodes}
          color="gray"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Client ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Redirect URIs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  Registered
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <ClientRow key={client.clientId} client={client} />
              ))}
              {clients.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">No OAuth clients yet</p>
                        <p className="text-sm mt-1">
                          Third-party apps will appear here when they register
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-navy/5 dark:bg-navy/20 rounded-xl p-4 border border-navy/10 dark:border-navy/30">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-navy dark:text-white/70 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-navy dark:text-white/70">
            <p className="font-medium">About OAuth clients:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-navy/70 dark:text-white/60">
              <li>
                Clients can register dynamically via the{" "}
                <code className="bg-navy/10 dark:bg-white/10 px-1 rounded">/oauth/register</code> endpoint
              </li>
              <li>
                Deleting a client will revoke all user grants and active tokens
              </li>
              <li>
                Users can also manage their authorized apps from their profile
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
