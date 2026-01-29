import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { Header, Footer } from "./components";
import { fetchCurrentUser, type AuthUser } from "./lib/admin-api.server";
import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  return { user };
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

export default function App() {
  const location = useLocation();
  const loaderData = useLoaderData<typeof loader>();
  const user = loaderData?.user;
  const isAdmin = location.pathname.startsWith("/admin");
  const isAuthPage = location.pathname === "/login";
  const isDevPage = location.pathname.startsWith("/_dev");

  // Admin routes, auth pages, and dev pages have their own layout
  if (isAdmin || isAuthPage || isDevPage) {
    return <Outlet />;
  }

  return (
    <>
      <Header user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
