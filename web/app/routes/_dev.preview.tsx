/**
 * Development Preview Page
 *
 * Shows different UI states for OAuth flows without going through the full auth flow.
 * Only available in development mode.
 */

import { useState, type ReactNode } from "react";
import { redirect } from "react-router";
import { Avatar } from "@tampadevs/react";
import type { Route } from "./+types/_dev.preview";

// Only allow in development
export async function loader() {
  if (process.env.NODE_ENV === "production") {
    throw redirect("/");
  }
  return null;
}

// Mock data for previews
const mockUser = {
  id: "dev-user-123",
  name: "Dev User",
  email: "dev@tampa.dev",
  avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
  role: "admin" as const,
};

const mockClient = {
  clientId: "mock-client-id-12345",
  clientName: "Tampa Tech Events",
  clientUri: "https://events.example.com",
  logoUri: null,
  redirectUris: ["https://events.example.com/callback"],
  policyUri: "https://events.example.com/privacy",
  tosUri: "https://events.example.com/terms",
};

const mockScopes = ["profile", "events:read", "groups:read"];

// Scope descriptions
const SCOPE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  profile: {
    label: "Your Profile",
    description: "Read your name, email, and avatar",
    icon: "user",
  },
  "events:read": {
    label: "Events",
    description: "View upcoming events and calendar",
    icon: "calendar",
  },
  "groups:read": {
    label: "Groups",
    description: "View tech groups and communities",
    icon: "users",
  },
  "rsvp:write": {
    label: "RSVPs",
    description: "RSVP to events on your behalf",
    icon: "check",
  },
};

function ScopeIcon({ scope }: { scope: string }) {
  const icons: Record<string, ReactNode> = {
    user: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const info = SCOPE_INFO[scope];
  return icons[info?.icon || "user"] || icons.user;
}

// ==================== PREVIEW COMPONENTS ====================

function LoginPagePreview() {
  return (
    <div className="min-h-[600px] bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4 rounded-xl">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <span className="text-4xl font-bold text-white">
            Tampa<span className="text-coral">.dev</span>
          </span>
          <p className="mt-4 text-white/60">
            Your gateway to Tampa Bay's tech community
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Welcome Back 👋
          </h1>
          <p className="text-white/60 text-center mb-8">
            Sign in to access your favorites, RSVPs, and more
          </p>

          <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-sm text-white/60">Save Favorites</p>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-white/60">RSVP Events</p>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-white/60">Get Updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentScreenPreview({ withLogo = false }: { withLogo?: boolean }) {
  const client = withLogo
    ? { ...mockClient, logoUri: "https://avatars.githubusercontent.com/u/1?v=4" }
    : mockClient;

  return (
    <div className="min-h-[700px] bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4 rounded-xl">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            Tampa<span className="text-coral">.dev</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Sign in with Tampa.dev</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              {client.logoUri ? (
                <img src={client.logoUri} alt={client.clientName} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {client.clientName}
                </h2>
                {client.clientUri && (
                  <span className="text-sm text-coral">
                    {new URL(client.clientUri).hostname}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Signing in as:</p>
            <div className="flex items-center gap-3">
              <Avatar src={mockUser.avatarUrl} name={mockUser.name} size="sm" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{mockUser.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{mockUser.email}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              This app would like to:
            </p>
            <ul className="space-y-3">
              {mockScopes.map((scope) => {
                const info = SCOPE_INFO[scope] || { label: scope, description: "Access this permission" };
                return (
                  <li key={scope} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-coral/10 text-coral flex items-center justify-center">
                      <ScopeIcon scope={scope} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{info.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{info.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3">
            <button className="w-full py-3 px-4 rounded-xl bg-coral hover:bg-coral-dark text-white font-semibold transition-colors">
              Allow Access
            </button>
            <button className="w-full py-3 px-4 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold transition-colors">
              Deny
            </button>

            {(client.policyUri || client.tosUri) && (
              <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                By authorizing, you agree to this app's{" "}
                <span className="text-coral">Terms of Service</span>
                {" and "}
                <span className="text-coral">Privacy Policy</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          You can revoke access at any time from your account settings
        </p>
      </div>
    </div>
  );
}

function ErrorStatePreview() {
  return (
    <div className="min-h-[400px] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 rounded-xl">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Authorization Error
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Missing required OAuth parameters. The application may have sent an invalid request.
        </p>
      </div>
    </div>
  );
}

function LoginErrorPreview() {
  return (
    <div className="min-h-[500px] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 rounded-xl">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            Tampa<span className="text-coral">.dev</span>
          </span>
          <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Sign In
          </h1>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">
            Authentication failed. Please try again.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

type PreviewTab = "login" | "consent" | "consent-logo" | "error" | "login-error";

export default function DevPreviewPage() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("login");

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: "login", label: "Login Page" },
    { id: "consent", label: "Consent (No Logo)" },
    { id: "consent-logo", label: "Consent (With Logo)" },
    { id: "error", label: "OAuth Error" },
    { id: "login-error", label: "Login Error" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium rounded">
              DEV ONLY
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              UI Preview
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Preview OAuth flow UI states without going through authentication
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                  ? "bg-coral text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview Container */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Preview: {tabs.find((t) => t.id === activeTab)?.label}
            </span>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </div>

          <div className="p-4">
            {activeTab === "login" && <LoginPagePreview />}
            {activeTab === "consent" && <ConsentScreenPreview />}
            {activeTab === "consent-logo" && <ConsentScreenPreview withLogo />}
            {activeTab === "error" && <ErrorStatePreview />}
            {activeTab === "login-error" && <LoginErrorPreview />}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/_dev/auth"
              className="px-4 py-2 bg-coral/10 text-coral rounded-lg text-sm font-medium hover:bg-coral/20 transition-colors"
            >
              Auto-Login as Dev User
            </a>
            <a
              href="/login"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Real Login Page
            </a>
            <a
              href="/admin"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Admin Panel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
