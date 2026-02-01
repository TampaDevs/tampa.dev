/**
 * Auto-generated TypeScript types from OpenAPI spec
 * DO NOT EDIT MANUALLY
 *
 * Generated from: http://localhost:8787/openapi.json
 * Generated at: 2026-02-01T20:57:54.332Z
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
                            favoritesCount?: number;
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
                            favoritesCount?: number;
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
    "/mcp": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * MCP SSE endpoint (not supported)
         * @description Server-Sent Events endpoint for server-initiated messages. Not implemented — use `POST /mcp` for all MCP communication.
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
                /** @description Bad Request — SSE not supported */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["McpError"];
                    };
                };
            };
        };
        put?: never;
        /**
         * MCP JSON-RPC endpoint
         * @description Model Context Protocol (MCP) endpoint using Streamable HTTP transport (spec version `2025-03-26`). Accepts JSON-RPC 2.0 requests for MCP protocol methods. Supports batch requests (up to 10). Notifications (requests without `id`) return 204 No Content.
         *
         *     **Supported methods:**
         *     - `initialize` — Capability negotiation and protocol version exchange
         *     - `tools/list` — List available tools (filtered by token scopes)
         *     - `tools/call` — Execute a tool with validated arguments
         *     - `resources/list` — List available resources
         *     - `resources/read` — Read a resource by URI
         *     - `resources/templates/list` — List URI templates for parameterized resources
         *     - `prompts/list` — List available prompt templates
         *     - `prompts/get` — Get a prompt template with arguments
         *     - `ping` — Health check
         *
         *     **Headers:** Include `Mcp-Session-Id` to maintain session context (echoed back in response).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description JSON-RPC 2.0 response (single `JsonRpcResponse` object or batch array). Per JSON-RPC 2.0, errors also return 200 with an `error` field. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": unknown;
                    };
                };
                /** @description No Content — notification processed (no response body) */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request — invalid Content-Type */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["McpError"];
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["McpError"];
                    };
                };
            };
        };
        /**
         * MCP session termination
         * @description Terminates an MCP session. Sessions are stateless on the server side, so this is a no-op that always returns 204.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content — session terminated */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get current user identity
         * @description Returns basic identity information for the authenticated user. Email is included only if the `user:email` scope is granted.
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
                /** @description Current user identity */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["UserBasic"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get current user profile
         * @description Returns the full profile for the authenticated user including bio, social links, and settings.
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
                /** @description Full user profile */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["UserProfile"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update current user profile
         * @description Updates the authenticated user's profile fields. Only provided fields are updated.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateProfileRequest"];
                };
            };
            responses: {
                /** @description Updated user profile */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["UserProfile"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Conflict — duplicate or state conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/me/linked-accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List linked OAuth accounts
         * @description Returns the OAuth providers (GitHub, Discord, etc.) connected to the authenticated user's account.
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
                /** @description Linked OAuth accounts */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["LinkedAccount"][];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/profile/portfolio": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List portfolio items
         * @description Returns all portfolio items for the authenticated user, ordered by sort order.
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
                /** @description Portfolio items */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["PortfolioItem"][];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create portfolio item
         * @description Adds a new portfolio item to the authenticated user's profile.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["PortfolioItemRequest"];
                };
            };
            responses: {
                /** @description Created portfolio item */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["PortfolioItem"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profile/portfolio/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete portfolio item
         * @description Permanently removes a portfolio item from the authenticated user's profile.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Portfolio item deleted */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update portfolio item
         * @description Updates an existing portfolio item. Only provided fields are changed.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["PortfolioItemUpdateRequest"];
                };
            };
            responses: {
                /** @description Updated portfolio item */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["PortfolioItem"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/profile/achievements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get achievement progress
         * @description Returns all achievements with the authenticated user's progress toward each.
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
                /** @description Achievement progress */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["AchievementProgress"][];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/profile/tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List personal access tokens
         * @description Returns all personal access tokens for the authenticated user. Token values are not included.
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
                /** @description Personal access tokens */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Token"][];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create personal access token
         * @description Creates a new personal access token. The full token value is returned only once in the response -- store it securely.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateTokenRequest"];
                };
            };
            responses: {
                /** @description Created token with full value */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["TokenCreated"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profile/tokens/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revoke personal access token
         * @description Permanently revokes a personal access token. The token can no longer be used for authentication.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Token revoked */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List upcoming events
         * @description Returns a paginated list of upcoming events across all groups, ordered by start time.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number | null;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Upcoming events */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["EventListItem"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/events/{eventId}/rsvp": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get RSVP status
         * @description Returns the authenticated user's RSVP status for the specified event.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description RSVP status (null if not RSVPed) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RsvpStatusResponse"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * RSVP to event
         * @description Creates an RSVP for the authenticated user. If the event is at capacity, the user is placed on the waitlist.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description RSVP created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Rsvp"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Conflict — duplicate or state conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Cancel RSVP
         * @description Cancels the authenticated user's RSVP. If a waitlisted user exists, they are automatically promoted.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description RSVP cancelled */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @enum {boolean} */
                                success: true;
                            };
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/events/{eventId}/rsvp-summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get RSVP summary
         * @description Returns aggregate RSVP counts (confirmed, waitlisted, cancelled) for the specified event.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description RSVP summary counts */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RsvpSummary"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/checkin/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Check in to event
         * @description Self check-in using a check-in code. Optionally specify the check-in method (link, qr, nfc).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    code: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Check-in recorded */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CheckinResult"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Conflict — duplicate or state conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Gone — resource expired or exhausted */
                410: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List groups
         * @description Returns a paginated list of groups displayed on the site, ordered by member count.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number | null;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Groups */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["GroupListItem"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/groups/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get group details
         * @description Returns detailed information about a group including its upcoming events.
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
                /** @description Group details with upcoming events */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["GroupDetail"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/favorites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List favorite groups
         * @description Returns the groups the authenticated user has favorited.
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
                /** @description Favorite groups */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: unknown[];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/favorites/{groupSlug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add group to favorites
         * @description Adds a group to the authenticated user's favorites. Returns 200 if already favorited.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupSlug: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Already favorited */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                alreadyFavorited: boolean;
                            };
                        };
                    };
                };
                /** @description Group added to favorites */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                groupSlug: string;
                            };
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Remove group from favorites
         * @description Removes a group from the authenticated user's favorites.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupSlug: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Favorite removed */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/users/{username}/follow": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Follow user
         * @description Follows the specified user. Returns 200 if already following.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    username: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Already following */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @enum {boolean} */
                                alreadyFollowing: true;
                            };
                        };
                    };
                };
                /** @description Now following user */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @enum {boolean} */
                                following: true;
                            };
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Unfollow user
         * @description Unfollows the specified user.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    username: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Unfollowed */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/users/{username}/followers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List followers
         * @description Returns a paginated list of users following the specified user.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number | null;
                };
                header?: never;
                path: {
                    username: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Followers */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["FollowEntry"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/users/{username}/following": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List following
         * @description Returns a paginated list of users the specified user is following.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number | null;
                };
                header?: never;
                path: {
                    username: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Following */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["FollowEntry"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
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
    "/v1/claim/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get badge claim info
         * @description Returns information about a badge claim link. No authentication required.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    code: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Claim link information */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ClaimInfo"];
                        };
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Gone — resource expired or exhausted */
                410: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Claim a badge
         * @description Claims a badge using a claim link code. Requires authentication.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    code: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Badge claimed */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ClaimBadgeResponse"];
                        };
                    };
                };
                /** @description Unauthorized — missing or invalid authentication */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Forbidden — insufficient scope or permissions */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Not Found — resource does not exist */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Conflict — duplicate or state conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Gone — resource expired or exhausted */
                410: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/scopes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List OAuth scopes
         * @description Returns all available OAuth scopes with descriptions and hierarchy. No authentication required.
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
                /** @description Available OAuth scopes */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Scope"][];
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        McpError: {
            error: string;
            code: string;
        };
        UserBasic: {
            id: string;
            name: string;
            avatarUrl: string | null;
            username: string | null;
            email?: string;
        };
        ErrorResponse: {
            /** @description Human-readable error message */
            error: string;
            /** @description Machine-readable error code */
            code: string;
        };
        UserProfile: {
            id: string;
            name: string;
            username: string | null;
            avatarUrl: string | null;
            heroImageUrl: string | null;
            themeColor: string | null;
            bio: string | null;
            location: string | null;
            socialLinks: string[] | null;
            role: string;
            /** @enum {string} */
            profileVisibility: "public" | "private";
            showAchievements: boolean | null;
            createdAt: string;
            email?: string;
        };
        UpdateProfileRequest: {
            name?: string;
            /** Format: uri */
            avatarUrl?: string | null;
            /** Format: uri */
            heroImageUrl?: string | null;
            /** @enum {string|null} */
            themeColor?: "coral" | "ocean" | "sunset" | "forest" | "violet" | "rose" | "slate" | "sky" | null;
            username?: string;
            bio?: string | null;
            location?: string | null;
            socialLinks?: string[] | null;
            showAchievements?: boolean;
            /** @enum {string} */
            profileVisibility?: "public" | "private";
        };
        LinkedAccount: {
            provider: string;
            providerUsername: string | null;
            providerEmail: string | null;
            createdAt: string | null;
        };
        PortfolioItem: {
            id: string;
            userId: string;
            title: string;
            description: string | null;
            url: string | null;
            imageUrl: string | null;
            sortOrder: number;
            createdAt: string | null;
        };
        PortfolioItemRequest: {
            title: string;
            description?: string | null;
            /** Format: uri */
            url?: string | null;
            /** Format: uri */
            imageUrl?: string | null;
            /** @default 0 */
            sortOrder: number;
        };
        PortfolioItemUpdateRequest: {
            title?: string;
            description?: string | null;
            /** Format: uri */
            url?: string | null;
            /** Format: uri */
            imageUrl?: string | null;
            /** @default 0 */
            sortOrder: number;
        };
        AchievementProgress: {
            key: string;
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            targetValue: number;
            currentValue: number;
            completedAt: string | null;
            badgeSlug: string | null;
            hidden: boolean;
        };
        Token: {
            id: string;
            name: string;
            tokenPrefix: string;
            scopes: string;
            expiresAt: string | null;
            createdAt: string | null;
            lastUsedAt: string | null;
        };
        TokenCreated: {
            id: string;
            name: string;
            /** @description Full token value. Store securely — it cannot be retrieved again. */
            token: string;
            tokenPrefix: string;
            scopes: string;
            expiresAt: string | null;
            createdAt: string | null;
        };
        CreateTokenRequest: {
            /** @description Human-readable name for the token */
            name: string;
            /** @description OAuth scopes to grant to this token */
            scopes: string[];
            /** @description Token expiry in days (1-365, default: no expiry) */
            expiresInDays?: number;
        };
        EventListItem: {
            id: string;
            title: string;
            description: string | null;
            startTime: string;
            endTime: string | null;
            timezone: string | null;
            eventUrl: string | null;
            photoUrl: string | null;
            eventType: string | null;
            rsvpCount: number | null;
            maxAttendees: number | null;
            group: {
                id: string;
                name: string;
                urlname: string | null;
            } | null;
        };
        Pagination: {
            /** @description Total number of items (may be absent if count is expensive) */
            total?: number;
            /** @description Maximum items per page */
            limit: number;
            /** @description Number of items skipped */
            offset: number;
            /** @description Whether more items exist beyond this page */
            hasMore: boolean;
        };
        Rsvp: {
            id: string;
            eventId: string;
            /** @enum {string} */
            status: "confirmed" | "waitlisted" | "cancelled";
            rsvpAt: string | null;
            waitlistPosition: number | null;
        } | null;
        RsvpStatusResponse: {
            rsvp: components["schemas"]["Rsvp"];
        };
        RsvpSummary: {
            total: number;
            confirmed: number;
            waitlisted: number;
            cancelled: number;
            capacity: number | null;
        };
        CheckinResult: {
            id: string;
            eventId: string;
            checkedInAt: string;
            method: string;
        };
        GroupListItem: {
            id: string;
            urlname: string | null;
            name: string;
            description: string | null;
            link: string | null;
            website: string | null;
            memberCount: number | null;
            photoUrl: string | null;
            tags?: unknown;
            socialLinks?: unknown;
        };
        GroupDetail: components["schemas"]["GroupListItem"] & {
            upcomingEvents: {
                id: string;
                title: string;
                startTime: string;
                eventUrl: string | null;
            }[];
        };
        FollowEntry: {
            username: string | null;
            name: string;
            avatarUrl: string | null;
            followedAt: string | null;
        };
        ClaimInfo: {
            badge: {
                name: string;
                slug: string;
                description: string | null;
                icon: string;
                color: string | null;
                points: number;
            };
            group: {
                name: string;
                urlname: string | null;
                photoUrl: string | null;
            } | null;
            claimable: boolean;
            reason?: string;
        };
        ClaimBadgeResponse: {
            badge: {
                name: string;
                slug: string;
            };
        };
        Scope: {
            name: string;
            description: string;
            implies: string[];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
