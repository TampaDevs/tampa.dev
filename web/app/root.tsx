import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useLoaderData,
} from "react-router";
import { useMemo } from "react";

import type { Route } from "./+types/root";
import { Header, Footer } from "./components";
import { fetchCurrentUser } from "./lib/admin-api.server";
import { WebSocketProvider } from "./hooks/WebSocketProvider";
import { NotificationToast } from "./components/NotificationToast";
import { CelebrationToast } from "./components/CelebrationToast";
import { SignInPromptModal } from "./components/SignInPromptModal";
import { useSignInPrompt, useTimedSignInPrompt } from "./hooks/useSignInPrompt";
import "./app.css";

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (loaderData && !loaderData.isProduction) {
    return [{ name: "robots", content: "noindex, nofollow" }];
  }
  return [];
};

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  const hostname = new URL(request.url).hostname;
  const isProduction = hostname === "tampa.dev" || hostname === "www.tampa.dev";
  return { user, isProduction };
}

/**
 * Prevent unnecessary revalidation of the root loader.
 * Only revalidate on explicit navigation or after logout.
 */
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: {
  formAction?: string;
  defaultShouldRevalidate: boolean;
}) {
  // Always revalidate after auth actions
  if (formAction?.startsWith("/auth/")) {
    return true;
  }
  // Otherwise, use default behavior for navigation
  return defaultShouldRevalidate;
}

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/png", href: "/favicon.png" },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F97066" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tampa.dev" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen flex flex-col">
        {children}
        <ScrollRestoration />
        <Scripts />
        {/* Prevent AddToCalendarButton from stealing scroll position on hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(window.location.hash === '') window.scrollTo(0, 0);`,
          }}
        />
      </body>
    </html>
  );
}

/** Pages where we start a timed sign-in prompt after 45 seconds of browsing */
const INTERACTIVE_PAGE_PATTERNS = ["/map", "/leaderboard", "/calendar", "/p/"];

export default function App() {
  const location = useLocation();
  const loaderData = useLoaderData<typeof loader>();
  const user = loaderData?.user;
  const isAdmin = location.pathname.startsWith("/admin");
  const isAuthPage = location.pathname === "/login";
  const isDevPage = location.pathname.startsWith("/_dev");

  // Sign-in prompt modal (listens for triggerSignInPrompt events)
  const { showModal, dismissModal } = useSignInPrompt(user);

  // Timed sign-in prompt for interactive pages (45s delay, once per session)
  const isInteractivePage = useMemo(
    () => INTERACTIVE_PAGE_PATTERNS.some((p) => location.pathname.startsWith(p)),
    [location.pathname],
  );
  useTimedSignInPrompt(user, isInteractivePage, 45000);

  // Admin routes, auth pages, and dev pages have their own layout
  if (isAdmin || isAuthPage || isDevPage) {
    return <Outlet />;
  }

  return (
    <WebSocketProvider user={user}>
      <Header user={user} />
      <main className="flex-1 relative z-0">
        <Outlet />
      </main>
      <Footer />
      <NotificationToast currentUserId={user?.id} />
      <CelebrationToast currentUserId={user?.id} />
      {showModal && <SignInPromptModal onClose={dismissModal} />}
    </WebSocketProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status = 500;
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details =
      error.status === 404
        ? "The page you're looking for doesn't exist or has been moved."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <p className="text-6xl font-bold text-coral mb-4">{status}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {message}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">{details}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral hover:bg-coral-dark text-white rounded-lg font-medium transition-colors"
            >
              Go Home
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Browse Events
            </Link>
          </div>
          {stack && (
            <pre className="mt-8 w-full p-4 overflow-x-auto text-left text-xs bg-gray-100 dark:bg-gray-800 rounded-lg">
              <code>{stack}</code>
            </pre>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
