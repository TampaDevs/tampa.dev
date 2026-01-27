import { type RouteConfig, index, route } from "@react-router/dev/routes";

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
] satisfies RouteConfig;
