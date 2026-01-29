import { fetchEvents, fetchGroups, toLocalGroup, getGroupUrlnames } from "~/lib/api.server";

const SITE_URL = "https://tampa.dev";

export async function loader() {
  const apiGroups = await fetchGroups();
  const groups = apiGroups.map(toLocalGroup);
  const urlnames = getGroupUrlnames(groups);

  const events = await fetchEvents({
    groups: urlnames,
    withinDays: 60,
  });

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/events", priority: "0.9", changefreq: "daily" },
    { url: "/groups", priority: "0.8", changefreq: "weekly" },
    { url: "/calendar", priority: "0.7", changefreq: "daily" },
    { url: "/map", priority: "0.7", changefreq: "daily" },
  ];

  const groupPages = groups.map((group) => ({
    url: `/groups/${group.slug}`,
    priority: "0.6",
    changefreq: "weekly",
  }));

  const eventPages = events.map((event) => ({
    url: `/events/${event.id}`,
    priority: "0.8",
    changefreq: "daily",
  }));

  const allPages = [...staticPages, ...groupPages, ...eventPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
