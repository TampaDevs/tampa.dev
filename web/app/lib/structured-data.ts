/**
 * JSON-LD Structured Data generators for SEO
 * https://schema.org/Event
 * https://schema.org/Organization
 * https://schema.org/WebSite
 * https://schema.org/FAQPage
 */

import type { Event, LocalGroupCompat } from "./types";

/**
 * Calculate end time from ISO 8601 duration
 */
function calculateEndTime(startTime: string, duration?: string): string | null {
  if (!duration) return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const start = new Date(startTime);
  const durationMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
  return new Date(start.getTime() + durationMs).toISOString();
}

/**
 * Generate JSON-LD for a single event
 */
export function eventToJsonLd(event: Event): object {
  const endDate = calculateEndTime(event.dateTime, event.duration);
  const venue = event.venues[0];

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.dateTime,
    ...(endDate && { endDate }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.isOnline
      ? {
          "@type": "VirtualLocation",
          url: event.eventUrl,
        }
      : venue
        ? {
            "@type": "Place",
            name: venue.name,
            address: {
              "@type": "PostalAddress",
              ...(venue.address && { streetAddress: venue.address }),
              ...(venue.city && { addressLocality: venue.city }),
              ...(venue.state && { addressRegion: venue.state }),
              ...(venue.postalCode && { postalCode: venue.postalCode }),
            },
            ...(venue.lat &&
              venue.lon && {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: venue.lat,
                  longitude: venue.lon,
                },
              }),
          }
        : undefined,
    ...(event.photoUrl && { image: event.photoUrl }),
    ...(event.description && { description: event.description.slice(0, 500) }),
    organizer: {
      "@type": "Organization",
      name: event.group.name,
      url: event.group.link,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: event.eventUrl,
    },
  };
}

/**
 * Generate JSON-LD for a list of events
 */
export function eventsToJsonLd(events: Event[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: eventToJsonLd(event),
    })),
  };
}

/**
 * Generate JSON-LD for an organization/group
 */
export function groupToJsonLd(group: LocalGroupCompat): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: group.name,
    description: group.description,
    url: group.website,
    ...(group.logo && { logo: group.logo }),
    ...(group.socialLinks && {
      sameAs: Object.values(group.socialLinks).filter(Boolean),
    }),
  };
}

/**
 * Generate JSON-LD for the Tampa.dev organization
 */
export function organizationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tampa.dev",
    url: "https://tampa.dev",
    description:
      "Tampa Bay tech events calendar and community index for developers, startup founders, and entrepreneurs.",
    sameAs: [
      "https://github.com/TampaDevs",
      "https://go.tampa.dev/slack",
      "https://tampadevs.com",
    ],
  };
}

/**
 * Generate JSON-LD for the website with SearchAction
 */
export function websiteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tampa.dev",
    alternateName: "Tampa Tech Events",
    description:
      "The Tampa Bay tech events calendar. Discover developer meetups, startup events, and tech communities across Tampa, St. Petersburg, and Clearwater.",
    url: "https://tampa.dev",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://tampa.dev/calendar?view=list&q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * FAQ item for FAQPage structured data
 */
export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Generate JSON-LD for FAQPage structured data
 */
export function faqPageJsonLd(faqs: FAQItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
