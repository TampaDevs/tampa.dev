import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("events", "routes/events.tsx"),
  route("events/:id", "routes/events.$id.tsx"),
  route("groups", "routes/groups._index.tsx"),
  route("groups/:slug", "routes/groups.$slug.tsx"),
  route("map", "routes/map.tsx"),
  route("calendar", "routes/calendar.tsx"),
  route("favorites", "routes/favorites.tsx"),
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),

  // Public login
  route("login", "routes/login.tsx"),

  // Auth routes
  route("auth/logout", "routes/auth.logout.tsx"),

  // User profile
  route("profile", "routes/profile.tsx"),
  route("p/:username", "routes/p.$username.tsx"),

  // Developer portal (self-service OAuth app registration)
  route("developer", "routes/developer.tsx"),

  // Developer documentation (MDX mini-docsite)
  layout("routes/developer.docs.tsx", [
    route("developer/docs", "routes/developer.docs._index.tsx", { index: true }),
    route("developer/docs/:slug", "routes/developer.docs.$slug.tsx"),
  ]),

  // OAuth authorization (consent screen for "Sign in with Tampa.dev")
  route("oauth/authorize", "routes/oauth.authorize.tsx"),

  // Admin login (outside layout)
  route("admin/login", "routes/admin.login.tsx"),

  // Admin routes (with layout)
  layout("routes/admin.tsx", [
    route("admin", "routes/admin._index.tsx", { index: true }),
    route("admin/groups", "routes/admin.groups._index.tsx"),
    route("admin/groups/new", "routes/admin.groups.new.tsx"),
    route("admin/groups/:id", "routes/admin.groups.$id.tsx"),
    route("admin/sync", "routes/admin.sync.tsx"),
    route("admin/users", "routes/admin.users.tsx"),
    route("admin/users/:id", "routes/admin.users.$id.tsx"),
    route("admin/oauth", "routes/admin.oauth.tsx"),
    route("admin/badges", "routes/admin.badges.tsx"),
    route("admin/flags", "routes/admin.flags.tsx"),
  ]),

  // Development-only routes (blocked in production by loaders)
  route("_dev/preview", "routes/_dev.preview.tsx"),
  route("_dev/auth", "routes/_dev.auth.tsx"),
] satisfies RouteConfig;
