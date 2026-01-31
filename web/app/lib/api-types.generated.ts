/**
 * Auto-generated TypeScript types from OpenAPI spec
 * DO NOT EDIT MANUALLY
 *
 * Generated from: http://localhost:8787/openapi.json
 * Generated at: 2026-01-30T05:01:16.888Z
 *
 * Regenerate with: npm run generate:types
 */

export interface paths {
    "/2026-01-25/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get all events
         * @description Returns a list of all upcoming events, optionally filtered by query parameters
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of events */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id: string;
                            title: string;
                            description?: string;
                            dateTime: string;
                            duration?: string;
                            eventUrl: string;
                            /** @enum {string} */
                            status: "ACTIVE" | "CANCELLED" | "DRAFT";
                            /** @enum {string} */
                            eventType?: "PHYSICAL" | "ONLINE" | "HYBRID";
                            rsvpCount: number;
                            venues: unknown[];
                            photo?: unknown;
                            group?: unknown;
                            address?: string | null;
                            googleMapsUrl?: string | null;
                            appleMapsUrl?: string | null;
                            photoUrl?: string | null;
                            isOnline: boolean;
                        }[];
                    };
                };
                /** @description Service unavailable - no event data */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/events/next": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get next event per group
         * @description Returns one upcoming event for each group (the next event)
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Next event for each group */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id: string;
                            title: string;
                            description?: string;
                            dateTime: string;
                            duration?: string;
                            eventUrl: string;
                            /** @enum {string} */
                            status: "ACTIVE" | "CANCELLED" | "DRAFT";
                            /** @enum {string} */
                            eventType?: "PHYSICAL" | "ONLINE" | "HYBRID";
                            rsvpCount: number;
                            venues: unknown[];
                            photo?: unknown;
                            group?: unknown;
                            address?: string | null;
                            googleMapsUrl?: string | null;
                            appleMapsUrl?: string | null;
                            photoUrl?: string | null;
                            isOnline: boolean;
                        }[];
                    };
                };
                /** @description Service unavailable - no event data */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get all public groups
         * @description Returns a list of all groups displayed on the website
         */
        get: {
            parameters: {
                query?: {
                    featured?: string;
                    tag?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of groups */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id: string;
                            urlname: string;
                            name: string;
                            description: string | null;
                            link: string;
                            website: string | null;
                            /** @enum {string} */
                            platform: "meetup" | "eventbrite" | "luma";
                            memberCount: number | null;
                            photoUrl: string | null;
                            isFeatured: boolean | null;
                            displayOnSite: boolean | null;
                            tags: string[] | null;
                            socialLinks: {
                                slack?: string;
                                discord?: string;
                                linkedin?: string;
                                twitter?: string;
                                github?: string;
                                meetup?: string;
                            } | null;
                        }[];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/groups/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a group by slug
         * @description Returns a single group by its URL slug
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    slug: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Group details */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id: string;
                            urlname: string;
                            name: string;
                            description: string | null;
                            link: string;
                            website: string | null;
                            /** @enum {string} */
                            platform: "meetup" | "eventbrite" | "luma";
                            memberCount: number | null;
                            photoUrl: string | null;
                            isFeatured: boolean | null;
                            displayOnSite: boolean | null;
                            tags: string[] | null;
                            socialLinks: {
                                slack?: string;
                                discord?: string;
                                linkedin?: string;
                                twitter?: string;
                                github?: string;
                                meetup?: string;
                            } | null;
                        };
                    };
                };
                /** @description Group not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/schemas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List all JSON schemas
         * @description Returns metadata about all available JSON schemas for the API models
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of available schemas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            schemas: {
                                name: string;
                                title: string;
                                description: string;
                                url: string;
                            }[];
                            version: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/schemas/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get specific JSON schema
         * @description Returns the JSON Schema for a specific model type
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    name: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description JSON Schema */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/schema+json": unknown;
                    };
                };
                /** @description Schema not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            error: string;
                            available: string[];
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/rss": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get RSS feed
         * @description Returns events as an RSS 2.0 feed
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description RSS feed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/rss+xml": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/feed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get RSS feed (alias)
         * @description Alias for /rss - returns events as an RSS 2.0 feed
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description RSS feed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/rss+xml": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/ics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get iCalendar feed
         * @description Returns events as an iCalendar (.ics) feed
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description iCalendar feed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/calendar": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/ical": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get iCalendar feed (alias)
         * @description Alias for /ics - returns events as an iCalendar (.ics) feed
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description iCalendar feed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/calendar": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/2026-01-25/webcal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get webcal feed
         * @description Returns events as an iCalendar feed (same as /ics, for webcal:// protocol)
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description iCalendar feed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/calendar": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/widget/next-event": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Next event HTML widget
         * @description Returns an HTML widget showing the next upcoming event
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description HTML widget */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/html": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/widget/carousel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Carousel HTML widget
         * @description Returns an HTML carousel widget showing upcoming events
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description HTML carousel widget */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/html": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/html": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * HTML page with upcoming events
         * @description Returns a formatted HTML page displaying upcoming events
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description HTML page */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/html": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/upcoming-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Upcoming events HTML page
         * @description Alias for /html - returns a formatted HTML page displaying upcoming events
         */
        get: {
            parameters: {
                query?: {
                    groups?: string;
                    noonline?: string;
                    within_hours?: string;
                    within_days?: string;
                    noempty?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description HTML page */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/html": string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
