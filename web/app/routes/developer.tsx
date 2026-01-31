/**
 * Developer Portal
 *
 * Allows authenticated users to register and manage their OAuth applications.
 */

import { redirect, useLoaderData, useFetcher, useRevalidator } from "react-router";
import { useState, useRef } from "react";
import type { Route } from "./+types/developer";
import { fetchCurrentUser } from "~/lib/admin-api.server";

interface DeveloperApp {
  clientId: string;
  name: string;
  description?: string;
  website?: string;
  logoUri?: string;
  redirectUris: string[];
  createdAt: string;
  activeUsers?: number;
}

interface DeveloperWebhook {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebhookDelivery {
  id: string;
  eventType: string;
  statusCode: number | null;
  attempt: number;
  deliveredAt: string;
  responseBody: string | null;
}

export const meta: Route.MetaFunction = () => [
  { title: "Developer Portal | Tampa.dev" },
  { name: "description", content: "Register and manage your OAuth applications." },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    throw redirect("/login?returnTo=/developer");
  }

  // Fetch user's apps
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  let apps: DeveloperApp[] = [];
  let webhooksList: DeveloperWebhook[] = [];

  try {
    const [appsRes, webhooksRes] = await Promise.all([
      fetch(`${apiUrl}/developer/apps`, {
        headers: {
          Accept: "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      }),
      fetch(`${apiUrl}/developer/webhooks`, {
        headers: {
          Accept: "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      }),
    ]);

    if (appsRes.ok) {
      const data = await appsRes.json() as { apps: DeveloperApp[] };
      apps = data.apps || [];
    }
    if (webhooksRes.ok) {
      const data = await webhooksRes.json() as { webhooks: DeveloperWebhook[] };
      webhooksList = data.webhooks || [];
    }
  } catch (error) {
    console.error("Failed to fetch developer data:", error);
  }

  return { user, apps, webhooks: webhooksList };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  if (intent === "create") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const redirectUris = (formData.get("redirectUris") as string)
      .split("\n")
      .map((uri) => uri.trim())
      .filter(Boolean);
    const website = formData.get("website") as string;

    try {
      const response = await fetch(`${apiUrl}/developer/apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          redirectUris,
          website: website || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { clientId: string; clientSecret: string };
        return { success: true, created: data };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to create app" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  if (intent === "delete") {
    const clientId = formData.get("clientId") as string;

    try {
      const response = await fetch(`${apiUrl}/developer/apps/${clientId}`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (response.ok) {
        return { success: true, deleted: clientId };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to delete app" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  if (intent === "regenerate") {
    const clientId = formData.get("clientId") as string;

    try {
      const response = await fetch(`${apiUrl}/developer/apps/${clientId}/regenerate-secret`, {
        method: "POST",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json() as { clientSecret: string };
        return { success: true, regenerated: { clientId, clientSecret: data.clientSecret } };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to regenerate secret" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  if (intent === "updateLogo") {
    const clientId = formData.get("clientId") as string;
    const logoUri = formData.get("logoUri") as string;

    try {
      const response = await fetch(`${apiUrl}/developer/apps/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ logoUri }),
      });

      if (response.ok) {
        return { success: true, logoUpdated: true };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to update logo" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  // ============== Webhook Actions ==============

  if (intent === "createWebhook") {
    const url = formData.get("url") as string;
    const eventTypesRaw = formData.get("eventTypes") as string;
    const eventTypes = eventTypesRaw ? eventTypesRaw.split(",").map((s) => s.trim()).filter(Boolean) : ["*"];

    try {
      const response = await fetch(`${apiUrl}/developer/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ url, eventTypes }),
      });

      if (response.ok) {
        const data = await response.json() as { id: string; secret: string };
        return { success: true, webhookCreated: data };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to create webhook" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  if (intent === "toggleWebhook") {
    const webhookId = formData.get("webhookId") as string;
    const isActive = formData.get("isActive") === "true";

    try {
      const response = await fetch(`${apiUrl}/developer/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to update webhook" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  if (intent === "deleteWebhook") {
    const webhookId = formData.get("webhookId") as string;

    try {
      const response = await fetch(`${apiUrl}/developer/webhooks/${webhookId}`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to delete webhook" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  if (intent === "testWebhook") {
    const webhookId = formData.get("webhookId") as string;
    const eventType = formData.get("eventType") as string | null;

    try {
      const response = await fetch(`${apiUrl}/developer/webhooks/${webhookId}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(eventType ? { eventType } : {}),
      });

      if (response.ok) {
        const data = await response.json() as { deliveryId: string; statusCode: number | null; success: boolean };
        return { success: true, testResult: data };
      } else {
        const error = await response.json() as { error?: string };
        return { success: false, error: error.error || "Failed to send test" };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }

  return { success: false };
}

// Logo upload component for OAuth apps
function LogoUpload({
  currentLogo,
  appName,
  onUploadComplete,
  size = "large",
}: {
  currentLogo?: string;
  appName: string;
  onUploadComplete: (url: string) => void;
  size?: "small" | "large";
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = size === "large" ? "w-20 h-20" : "w-12 h-12";
  const iconSize = size === "large" ? "w-8 h-8" : "w-5 h-5";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, GIF, or WebP image");
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setError("Image must be less than 1MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      // Step 1: Request presigned upload URL
      const requestResponse = await fetch("/api/uploads/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "app-logo",
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!requestResponse.ok) {
        const data = await requestResponse.json() as { error?: string };
        throw new Error(data.error || "Failed to request upload");
      }

      const { uploadUrl, finalUrl, contentType } = await requestResponse.json() as {
        uploadUrl: string;
        finalUrl: string;
        contentType: string;
      };

      // Step 2: Upload directly to R2 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      // Call the completion handler with the final public URL
      onUploadComplete(finalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <div
        className={`${sizeClasses} rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden group cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        {previewUrl || currentLogo ? (
          <img
            src={previewUrl || currentLogo}
            alt={appName}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className={`${iconSize} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
          {isUploading ? (
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

function CreateAppForm({ onSuccess }: { onSuccess: (data: { clientId: string; clientSecret: string }) => void }) {
  const fetcher = useFetcher<{ success: boolean; created?: { clientId: string; clientSecret: string }; error?: string }>();
  const isSubmitting = fetcher.state !== "idle";

  // Handle successful creation
  if (fetcher.data?.success && fetcher.data.created) {
    onSuccess(fetcher.data.created);
  }

  return (
    <fetcher.Form method="post" className="space-y-4">
      <input type="hidden" name="intent" value="create" />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          App Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
          placeholder="My Awesome App"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
          placeholder="What does your app do?"
        />
      </div>

      <div>
        <label htmlFor="redirectUris" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Redirect URIs * (one per line)
        </label>
        <textarea
          id="redirectUris"
          name="redirectUris"
          required
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          placeholder="https://myapp.com/callback&#10;http://localhost:3000/callback"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          OAuth redirect URIs where users will be sent after authorization
        </p>
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Website URL
        </label>
        <input
          type="url"
          id="website"
          name="website"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
          placeholder="https://myapp.com"
        />
      </div>

      {fetcher.data?.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{fetcher.data.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-coral hover:bg-coral-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create Application"}
      </button>
    </fetcher.Form>
  );
}

function CredentialsModal({
  credentials,
  onClose,
}: {
  credentials: { clientId: string; clientSecret: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"id" | "secret" | null>(null);

  const copyToClipboard = async (text: string, type: "id" | "secret") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">App Created!</h2>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> Copy your client secret now. You won't be able to see it again!
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client ID
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white overflow-x-auto">
                {credentials.clientId}
              </code>
              <button
                onClick={() => copyToClipboard(credentials.clientId, "id")}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied === "id" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Secret
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white overflow-x-auto">
                {credentials.clientSecret}
              </code>
              <button
                onClick={() => copyToClipboard(credentials.clientSecret, "secret")}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied === "secret" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          I've saved my credentials
        </button>
      </div>
    </div>
  );
}

function AppCard({ app, onDelete, onLogoUpdate }: { app: DeveloperApp; onDelete: () => void; onLogoUpdate: (clientId: string, logoUri: string) => void }) {
  const fetcher = useFetcher<{ success: boolean; regenerated?: { clientSecret: string }; error?: string }>();
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Handle regenerated secret
  if (fetcher.data?.regenerated?.clientSecret && !showSecret) {
    setShowSecret(fetcher.data.regenerated.clientSecret);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start gap-4">
        <LogoUpload
          currentLogo={app.logoUri}
          appName={app.name}
          size="small"
          onUploadComplete={(url) => onLogoUpdate(app.clientId, url)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{app.name}</h3>
              {app.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{app.description}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-mono">{app.clientId}</p>
            </div>
            {app.website && (
              <a
                href={app.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral hover:underline text-sm flex-shrink-0"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Redirect URIs:</p>
        <div className="space-y-1">
          {app.redirectUris.map((uri, i) => (
            <code key={i} className="block text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300 truncate">
              {uri}
            </code>
          ))}
        </div>
      </div>

      {showSecret && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">New Client Secret:</p>
          <code className="text-sm font-mono text-amber-900 dark:text-amber-100 break-all">{showSecret}</code>
          <button
            onClick={() => setShowSecret(null)}
            className="mt-2 text-xs text-amber-700 dark:text-amber-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="regenerate" />
          <input type="hidden" name="clientId" value={app.clientId} />
          <button
            type="submit"
            disabled={fetcher.state !== "idle"}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {fetcher.state !== "idle" ? "..." : "Regenerate Secret"}
          </button>
        </fetcher.Form>

        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
        Created {new Date(app.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

const AVAILABLE_EVENT_TYPES = [
  { value: "*", label: "All Events", adminOnly: false },
  { value: "dev.tampa.events.synced", label: "Events Synced", adminOnly: false },
  { value: "dev.tampa.sync.completed", label: "Sync Completed", adminOnly: false },
  { value: "dev.tampa.user.favorite_added", label: "Favorite Added", adminOnly: false },
  { value: "dev.tampa.user.portfolio_item_created", label: "Portfolio Item Created", adminOnly: false },
  { value: "dev.tampa.user.identity_linked", label: "Identity Linked", adminOnly: true },
  { value: "dev.tampa.user.registered", label: "User Registered", adminOnly: true },
  { value: "dev.tampa.user.deleted", label: "User Deleted", adminOnly: true },
  { value: "test.ping", label: "Test Ping", adminOnly: false },
];

const TEST_EVENT_TYPES = AVAILABLE_EVENT_TYPES.filter((et) => et.value !== "*");

function WebhookCard({
  webhook,
  onToggle,
  onDelete,
  onTest,
}: {
  webhook: DeveloperWebhook;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string, eventType?: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [testEventType, setTestEventType] = useState("test.ping");

  const loadDeliveries = async () => {
    if (showDeliveries) {
      setShowDeliveries(false);
      return;
    }
    setLoadingDeliveries(true);
    try {
      const response = await fetch(`/api/developer/webhooks/${webhook.id}/deliveries`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { deliveries: WebhookDelivery[] };
        setDeliveries(data.deliveries);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDeliveries(false);
      setShowDeliveries(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${webhook.isActive ? "bg-green-500" : "bg-gray-400"}`} />
            <code className="text-sm font-mono text-gray-900 dark:text-white truncate block">
              {webhook.url}
            </code>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {webhook.eventTypes.map((et) => (
              <span
                key={et}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded"
              >
                {et}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggle(webhook.id, !webhook.isActive)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${webhook.isActive
              ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              : "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
            }`}
        >
          {webhook.isActive ? "Pause" : "Enable"}
        </button>

        <div className="flex items-center gap-1.5">
          <select
            value={testEventType}
            onChange={(e) => setTestEventType(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-coral/50"
          >
            {TEST_EVENT_TYPES.map((et) => (
              <option key={et.value} value={et.value}>{et.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onTest(webhook.id, testEventType)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Send Test
          </button>
        </div>

        <button
          type="button"
          onClick={loadDeliveries}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          {loadingDeliveries ? "..." : showDeliveries ? "Hide Deliveries" : "Deliveries"}
        </button>

        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDelete(webhook.id)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Confirm Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Delivery Log */}
      {showDeliveries && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Deliveries
          </h4>
          {deliveries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No deliveries yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {deliveries.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${d.statusCode && d.statusCode >= 200 && d.statusCode < 300
                          ? "bg-green-500"
                          : "bg-red-500"
                        }`}
                    />
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {d.eventType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-mono text-xs ${d.statusCode && d.statusCode >= 200 && d.statusCode < 300
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                      }`}>
                      {d.statusCode || "ERR"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(d.deliveredAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
        Created {new Date(webhook.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function WebhookSecretModal({
  secret,
  onClose,
}: {
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Webhook Created!</h2>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> Copy your webhook signing secret now. You won't be able to see it again!
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Signing Secret
          </label>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white overflow-x-auto">
              {secret}
            </code>
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Use this secret to verify webhook signatures via the <code className="text-xs">X-Webhook-Signature</code> header (HMAC-SHA256).
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          I've saved my secret
        </button>
      </div>
    </div>
  );
}

export default function DeveloperPortal() {
  const { apps, webhooks: webhooksList } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<"apps" | "webhooks">("apps");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEventTypes, setWebhookEventTypes] = useState("*");
  const fetcher = useFetcher();
  const webhookFetcher = useFetcher<{ success: boolean; webhookCreated?: { secret: string }; testResult?: { statusCode: number | null; success: boolean }; error?: string }>();
  const { revalidate } = useRevalidator();

  // Handle webhook creation result
  if (webhookFetcher.data?.webhookCreated?.secret && !newWebhookSecret) {
    setNewWebhookSecret(webhookFetcher.data.webhookCreated.secret);
    setShowWebhookForm(false);
    setWebhookUrl("");
    setWebhookEventTypes("*");
  }

  const handleAppCreated = (credentials: { clientId: string; clientSecret: string }) => {
    setNewCredentials(credentials);
    setShowCreateForm(false);
  };

  const handleDeleteApp = (clientId: string) => {
    fetcher.submit(
      { intent: "delete", clientId },
      { method: "post" }
    );
  };

  const handleLogoUpdate = async (clientId: string, logoUri: string) => {
    try {
      const response = await fetch(`/api/developer/apps/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logoUri }),
      });

      if (!response.ok) {
        console.error("Failed to update logo");
      }
    } catch (error) {
      console.error("Failed to update logo:", error);
    }

    revalidate();
  };

  const handleToggleWebhook = (webhookId: string, isActive: boolean) => {
    fetcher.submit(
      { intent: "toggleWebhook", webhookId, isActive: String(isActive) },
      { method: "post" }
    );
  };

  const handleDeleteWebhook = (webhookId: string) => {
    fetcher.submit(
      { intent: "deleteWebhook", webhookId },
      { method: "post" }
    );
  };

  const handleTestWebhook = (webhookId: string, eventType?: string) => {
    fetcher.submit(
      { intent: "testWebhook", webhookId, ...(eventType ? { eventType } : {}) },
      { method: "post" }
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Developer Portal</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Build applications that integrate with Tampa.dev
        </p>
      </div>

      {/* Quick Links */}
      <div className="mb-8 p-4 bg-navy/5 dark:bg-navy-light/10 rounded-xl border border-navy/10 dark:border-navy-light/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-navy dark:text-navy-light mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">OAuth 2.1 with PKCE</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tampa.dev uses OAuth 2.1 with PKCE for secure authorization. Your app can request access to user profiles, events, groups, RSVPs, and favorites.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <a
                href="/developer/docs"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy dark:bg-navy-light text-white text-sm font-medium rounded-lg hover:bg-navy/90 dark:hover:bg-navy-light/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                API Documentation
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("apps")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "apps"
                ? "border-coral text-coral"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            Applications ({apps.length})
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "webhooks"
                ? "border-coral text-coral"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            Webhooks ({webhooksList.length})
          </button>
        </nav>
      </div>

      {/* Apps Tab */}
      {activeTab === "apps" && (
        <>
          {/* Create App Button / Form */}
          {showCreateForm ? (
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Register New Application</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CreateAppForm onSuccess={handleAppCreated} />
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-coral hover:bg-coral-dark text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Register New Application
            </button>
          )}

          {/* Apps List */}
          {apps.length > 0 ? (
            <div className="grid gap-4">
              {apps.map((app) => (
                <AppCard
                  key={app.clientId}
                  app={app}
                  onDelete={() => handleDeleteApp(app.clientId)}
                  onLogoUpdate={handleLogoUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No applications yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Register your first OAuth application to get started.
              </p>
            </div>
          )}
        </>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <>
          {/* Create Webhook Form */}
          {showWebhookForm ? (
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Webhook</h2>
                <button
                  onClick={() => setShowWebhookForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <webhookFetcher.Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="createWebhook" />
                <div>
                  <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payload URL *
                  </label>
                  <input
                    type="url"
                    id="webhookUrl"
                    name="url"
                    required
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                    placeholder="https://example.com/webhooks/tampadevs"
                  />
                </div>
                <div>
                  <label htmlFor="webhookEvents" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Types
                  </label>
                  <select
                    id="webhookEvents"
                    value={webhookEventTypes}
                    onChange={(e) => setWebhookEventTypes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                  >
                    {AVAILABLE_EVENT_TYPES.map((et) => (
                      <option key={et.value} value={et.value}>{et.label}</option>
                    ))}
                  </select>
                  <input type="hidden" name="eventTypes" value={webhookEventTypes} />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select "All Events" to receive every event type.
                  </p>
                </div>
                {webhookFetcher.data?.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{webhookFetcher.data.error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={webhookFetcher.state !== "idle"}
                  className="w-full px-4 py-2 bg-coral hover:bg-coral-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {webhookFetcher.state !== "idle" ? "Creating..." : "Create Webhook"}
                </button>
              </webhookFetcher.Form>
            </div>
          ) : (
            <button
              onClick={() => setShowWebhookForm(true)}
              className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-coral hover:bg-coral-dark text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Webhook
            </button>
          )}

          {/* Webhooks List */}
          {webhooksList.length > 0 ? (
            <div className="grid gap-4">
              {webhooksList.map((wh) => (
                <WebhookCard
                  key={wh.id}
                  webhook={wh}
                  onToggle={handleToggleWebhook}
                  onDelete={handleDeleteWebhook}
                  onTest={handleTestWebhook}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No webhooks yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create a webhook to receive real-time notifications when events occur.
              </p>
            </div>
          )}
        </>
      )}

      {/* Credentials Modal */}
      {newCredentials && (
        <CredentialsModal
          credentials={newCredentials}
          onClose={() => {
            setNewCredentials(null);
            window.location.reload();
          }}
        />
      )}

      {/* Webhook Secret Modal */}
      {newWebhookSecret && (
        <WebhookSecretModal
          secret={newWebhookSecret}
          onClose={() => {
            setNewWebhookSecret(null);
            revalidate();
          }}
        />
      )}
    </div>
  );
}
