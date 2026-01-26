/**
 * Meetup Platform Implementation
 *
 * Fetches event data from Meetup.com via their GraphQL API.
 */

import type { Env } from '../../../app.js';
import type { EventPlatform } from '../base.js';
import type { PlatformFetchResult } from '../types.js';
import { getAccessToken } from './auth.js';
import { MeetupClient, MeetupRateLimitError } from './client.js';

/**
 * Meetup platform for fetching events
 */
export class MeetupPlatform implements EventPlatform {
  readonly name = 'meetup';

  private client: MeetupClient | null = null;

  /**
   * Check if the Meetup platform is properly configured
   */
  isConfigured(env: Env): boolean {
    return !!(
      env.MEETUP_CLIENT_KEY &&
      env.MEETUP_SIGNING_KEY &&
      env.MEETUP_MEMBER_ID
    );
  }

  /**
   * Initialize the Meetup platform by obtaining an access token
   */
  async initialize(env: Env): Promise<void> {
    if (!this.isConfigured(env)) {
      throw new Error('Meetup platform is not configured. Missing required secrets.');
    }

    const accessToken = await getAccessToken({
      clientKey: env.MEETUP_CLIENT_KEY!,
      signingKey: env.MEETUP_SIGNING_KEY!,
      memberId: env.MEETUP_MEMBER_ID!,
    });

    this.client = new MeetupClient(accessToken);
  }

  /**
   * Fetch events for a specific Meetup group
   */
  async fetchGroupEvents(
    groupUrlname: string,
    maxEvents: number = 25
  ): Promise<PlatformFetchResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Meetup client not initialized. Call initialize() first.',
      };
    }

    try {
      const data = await this.client.getGroupEvents(groupUrlname, maxEvents);

      if (!data) {
        return {
          success: false,
          error: `Group not found: ${groupUrlname}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof MeetupRateLimitError) {
        return {
          success: false,
          error: `Rate limited: ${error.message} (resets at: ${error.resetAt})`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export a singleton instance
export const meetupPlatform = new MeetupPlatform();
