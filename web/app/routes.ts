import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("events", "routes/events.tsx"),
  route("events/:id", "routes/events.$id.tsx"),
  route("groups", "routes/groups._index.tsx"),
  route("groups/manage", "routes/groups.manage.tsx"),
  route("groups/:slug", "routes/groups.$slug.tsx"),
  route("groups/:slug/members", "routes/groups.$slug.members.tsx"),

  // Group management dashboard (auth-gated layout with sidebar)
  layout("routes/groups.$slug.manage.tsx", [
    route("groups/:slug/manage", "routes/groups.$slug.manage._index.tsx", { index: true }),
    route("groups/:slug/manage/settings", "routes/groups.$slug.manage.settings.tsx"),
    route("groups/:slug/manage/members", "routes/groups.$slug.manage.members.tsx"),
    route("groups/:slug/manage/events", "routes/groups.$slug.manage.events.tsx"),
    route("groups/:slug/manage/events/new", "routes/groups.$slug.manage.events.new.tsx"),
    route("groups/:slug/manage/events/:eventId", "routes/groups.$slug.manage.events.$eventId.tsx"),
    route("groups/:slug/manage/badges", "routes/groups.$slug.manage.badges.tsx"),
    route("groups/:slug/manage/checkins", "routes/groups.$slug.manage.checkins.tsx"),
  ]),
  route("map", "routes/map.tsx"),
  route("calendar", "routes/calendar.tsx"),
  route("favorites", "routes/favorites.tsx"),
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),

  // Public pages
  route("leaderboard", "routes/leaderboard.tsx"),
  route("members", "routes/members.tsx"),
  route("claim/:code", "routes/claim.$code.tsx"),
  route("checkin/:code", "routes/checkin.$code.tsx"),
  route("groups/create", "routes/groups.create.tsx"),
  route("groups/claim/:token", "routes/groups.claim.$token.tsx"),
  route("groups/:slug/leaderboard", "routes/groups.$slug.leaderboard.tsx"),

  // Public login
  route("login", "routes/login.tsx"),
  route("link/:provider", "routes/link.$provider.tsx"),

  // Auth routes
  route("auth/logout", "routes/auth.logout.tsx"),

  // User profile (layout with tab sub-routes — C5 split)
  layout("routes/profile.tsx", [
    route("profile", "routes/profile._index.tsx", { index: true }),
    route("profile/accounts", "routes/profile.accounts.tsx"),
    route("profile/portfolio", "routes/profile.portfolio.tsx"),
    route("profile/achievements", "routes/profile.achievements.tsx"),
    route("profile/settings", "routes/profile.settings.tsx"),
    route("profile/developer", "routes/profile.developer.tsx"),
    route("profile/feeds", "routes/profile.feeds.tsx"),
  ]),
  route("p/:username", "routes/p.$username.tsx"),
  route("p/:username/followers", "routes/p.$username.followers.tsx"),
  route("p/:username/following", "routes/p.$username.following.tsx"),

  // Developer portal (self-service OAuth app registration)
  route("developer", "routes/developer.tsx"),

  // Developer documentation (MDX mini-docsite)
  layout("routes/developer.docs.tsx", [
    route("developer/docs", "routes/developer.docs._index.tsx", { index: true }),
    route("developer/docs/:slug", "routes/developer.docs.$slug.tsx"),
  ]),

  // Documentation hub
  route("docs", "routes/docs._index.tsx"),

  // Platform guide documentation (MDX mini-docsite)
  layout("routes/docs.platform.tsx", [
    route("docs/platform", "routes/docs.platform._index.tsx", { index: true }),
    route("docs/platform/:slug", "routes/docs.platform.$slug.tsx"),
  ]),

  // OAuth authorization (consent screen for "Sign in with Tampa.dev")
  route("oauth/authorize", "routes/oauth.authorize.tsx"),

  // Policy pages (content from content/policies/*.mdx)
  route("policies/privacy", "routes/policy.tsx", { id: "policy-privacy" }),
  route("policies/terms", "routes/policy.tsx", { id: "policy-terms" }),

  // SEO landing pages (content from content/pages/*.mdx)
  route("tampa-bay-tech-events", "routes/page.tsx", { id: "page-tampa-bay-tech-events" }),
  route("tampa-developer-meetups", "routes/page.tsx", { id: "page-tampa-developer-meetups" }),
  route("st-petersburg-tech-events", "routes/page.tsx", { id: "page-st-petersburg-tech-events" }),
  route("clearwater-tech-events", "routes/page.tsx", { id: "page-clearwater-tech-events" }),
  route("tampa-ai-meetups", "routes/page.tsx", { id: "page-tampa-ai-meetups" }),
  route("tampa-startup-events", "routes/page.tsx", { id: "page-tampa-startup-events" }),
  route("tampa-founder-meetups", "routes/page.tsx", { id: "page-tampa-founder-meetups" }),
  route("tampa-entrepreneurship-events", "routes/page.tsx", { id: "page-tampa-entrepreneurship-events" }),
  route("tampa-startup-ecosystem", "routes/page.tsx", { id: "page-tampa-startup-ecosystem" }),
  route("builders", "routes/page.tsx", { id: "page-builders" }),

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
    route("admin/achievements", "routes/admin.achievements.tsx"),
    route("admin/webhooks", "routes/admin.webhooks.tsx"),
    route("admin/entitlements", "routes/admin.entitlements.tsx"),
    route("admin/claims", "routes/admin.claims.tsx"),
    route("admin/group-requests", "routes/admin.group-requests.tsx"),
    route("admin/flags", "routes/admin.flags.tsx"),
  ]),

  // Development-only routes (blocked in production by loaders)
  route("_dev/preview", "routes/_dev.preview.tsx"),
  route("_dev/auth", "routes/_dev.auth.tsx"),
] satisfies RouteConfig;
