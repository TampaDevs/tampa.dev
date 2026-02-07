/**
 * Profile Settings Tab
 *
 * Danger zone: account deletion.
 */

import { useFetcher, redirect } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/profile.settings";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  if (intent === "deleteAccount") {
    try {
      const response = await fetch(`${apiUrl}/profile`, {
        method: "DELETE",
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      const clearCookies = [
        "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Domain=.tampa.dev",
        "session_staging=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Domain=.tampa.dev",
      ];
      return redirect("/", {
        headers: [
          ["Set-Cookie", clearCookies[0]],
          ["Set-Cookie", clearCookies[1]],
        ],
      });
    } catch (error) {
      console.error("Failed to delete account:", error);
      return { success: false, error: "Failed to delete account" };
    }
  }

  return { success: false };
}

function DeleteAccountButton() {
  const fetcher = useFetcher();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const isDeleting = fetcher.state !== "idle";

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto">
      <p className="text-sm text-red-600 dark:text-red-400">
        Type <strong>DELETE</strong> to confirm:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE"
        className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      />
      <div className="flex gap-2">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="deleteAccount" />
          <button
            type="submit"
            disabled={confirmText !== "DELETE" || isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </button>
        </fetcher.Form>
        <button
          onClick={() => { setShowConfirm(false); setConfirmText(""); }}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SettingsTab() {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
        Danger Zone
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Delete Account
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <DeleteAccountButton />
        </div>
      </div>
    </section>
  );
}
