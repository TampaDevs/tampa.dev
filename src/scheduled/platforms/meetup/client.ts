/**
 * Meetup GraphQL API Client
 *
 * Minimal client for fetching event data from Meetup's GraphQL API.
 */

import type { PlatformGroupData } from '../types.js';

const MEETUP_GQL_URL = 'https://api.meetup.com/gql-ext';

/**
 * Error thrown when rate limited by Meetup API
 */
export class MeetupRateLimitError extends Error {
  constructor(
    message: string,
    public consumedPoints?: number,
    public resetAt?: string
  ) {
    super(message);
    this.name = 'MeetupRateLimitError';
  }
}

/**
 * GraphQL response structure
 */
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
      consumedPoints?: number;
      resetAt?: string;
    };
  }>;
}

/**
 * Check for rate limiting in GraphQL response
 */
function checkRateLimiting(response: GraphQLResponse<unknown>): void {
  if (response.errors) {
    for (const error of response.errors) {
      if (error.extensions?.code === 'RATE_LIMITED') {
        throw new MeetupRateLimitError(
          error.message,
          error.extensions.consumedPoints,
          error.extensions.resetAt
        );
      }
    }
  }
}

/**
 * GraphQL query for fetching a group's upcoming events
 */
const GET_GROUP_EVENTS_QUERY = `
query($urlname: String!, $n: Int!, $after: String) {
  groupByUrlname(urlname: $urlname) {
    id
    name
    urlname
    link
    keyGroupPhoto { id baseUrl }
    memberships { totalCount }
    events(first: $n, after: $after, status: ACTIVE) {
      totalCount
      pageInfo { endCursor hasNextPage }
      edges {
        node {
          id
          title
          description
          dateTime
          duration
          eventUrl
          eventType
          status
          featuredEventPhoto { id baseUrl }
          rsvps { totalCount }
          venues {
            name
            address
            city
            state
            postalCode
            lat
            lon
          }
        }
      }
    }
  }
}`;

/**
 * Response type for group events query
 */
interface GroupEventsResponse {
  groupByUrlname: PlatformGroupData | null;
}

/**
 * Meetup GraphQL API Client
 */
export class MeetupClient {
  constructor(private accessToken: string) {}

  /**
   * Send a GraphQL query to the Meetup API
   */
  private async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(MEETUP_GQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Meetup API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    // Check for rate limiting
    checkRateLimiting(result);

    // Check for other GraphQL errors
    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return result.data;
  }

  /**
   * Fetch upcoming events for a group
   * @param groupUrlname - The URL name of the group (e.g., "tampadevs")
   * @param maxEvents - Maximum number of events to fetch (default: 25)
   */
  async getGroupEvents(
    groupUrlname: string,
    maxEvents: number = 25
  ): Promise<PlatformGroupData | null> {
    const data = await this.query<GroupEventsResponse>(GET_GROUP_EVENTS_QUERY, {
      urlname: groupUrlname,
      n: maxEvents,
      after: null,
    });

    return data.groupByUrlname;
  }
}
