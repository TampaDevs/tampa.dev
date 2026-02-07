/**
 * Event Aggregator
 *
 * Orchestrates fetching events from all configured platforms
 * and stores the aggregated data in KV.
 */

import type { Env } from '../app.js';
import type { AggregatedData, PlatformFetchResult } from './platforms/types.js';
import { platformRegistry } from './platforms/base.js';
import { meetupPlatform } from './platforms/meetup/index.js';
import { getGroupsByPlatform, type GroupConfig } from './groups.js';

// Register available platforms
platformRegistry.register(meetupPlatform);

// Maximum concurrent requests per platform
const MAX_CONCURRENT_REQUESTS = 5;

/**
 * Process items with limited concurrency
 */
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Check if promise is settled by racing with an immediate resolve
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) {
          executing.splice(i, 1);
        }
      }
    }
  }

  // Wait for remaining promises
  await Promise.all(executing);
  return results;
}

/**
 * Result of an aggregation run
 */
export interface AggregationResult {
  success: boolean;
  groupsProcessed: number;
  groupsFailed: number;
  errors: string[];
  durationMs: number;
}

/**
 * Metadata stored alongside aggregated data for caching and diagnostics
 */
export interface AggregationMetadata {
  lastRunAt: string; // ISO 8601 timestamp
  durationMs: number;
  groupsProcessed: number;
  groupsFailed: number;
  dataHash: string;
  errors: string[];
}

/**
 * Generate a hash of the data for cache invalidation
 */
function generateDataHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Run the event aggregation process
 *
 * Fetches events from all configured platforms and stores
 * the aggregated data in KV.
 */
export async function runAggregation(env: Env): Promise<AggregationResult> {
  const startTime = Date.now();
  const result: AggregationResult = {
    success: false,
    groupsProcessed: 0,
    groupsFailed: 0,
    errors: [],
    durationMs: 0,
  };

  const aggregatedData: AggregatedData = {};

  // Get all configured platforms
  const configuredPlatforms = platformRegistry.getConfigured(env);

  if (configuredPlatforms.length === 0) {
    result.errors.push('No platforms configured. Check environment secrets.');
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Initialize all platforms
  for (const platform of configuredPlatforms) {
    try {
      await platform.initialize(env);
      console.log(`Initialized platform: ${platform.name}`);
    } catch (error) {
      const errorMsg = `Failed to initialize ${platform.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // Fetch events from each platform (with concurrency limiting)
  for (const platform of configuredPlatforms) {
    const groups = getGroupsByPlatform(platform.name);
    console.log(`Fetching ${groups.length} groups from ${platform.name} (max ${MAX_CONCURRENT_REQUESTS} concurrent)`);

    interface FetchResult {
      urlname: string;
      success: boolean;
      data?: PlatformFetchResult['data'];
      error?: string;
    }

    const fetchResults = await processWithConcurrency<GroupConfig, FetchResult>(
      groups,
      MAX_CONCURRENT_REQUESTS,
      async (group) => {
        try {
          const fetchResult = await platform.fetchGroupEvents(
            group.urlname,
            group.maxEvents
          );

          if (fetchResult.success && fetchResult.data) {
            console.log(`Fetched: ${group.urlname}`);
            return { urlname: group.urlname, success: true, data: fetchResult.data };
          } else {
            console.warn(`Failed to fetch ${group.urlname}: ${fetchResult.error}`);
            return { urlname: group.urlname, success: false, error: fetchResult.error };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error fetching ${group.urlname}: ${errorMsg}`);
          return { urlname: group.urlname, success: false, error: errorMsg };
        }
      }
    );

    // Process results
    for (const fetchResult of fetchResults) {
      if (fetchResult.success && fetchResult.data) {
        aggregatedData[fetchResult.urlname] = fetchResult.data;
        result.groupsProcessed++;
      } else {
        result.groupsFailed++;
      }
    }
  }

  // Store aggregated data and metadata in KV
  result.durationMs = Date.now() - startTime;

  if (result.groupsProcessed > 0) {
    try {
      const eventDataJson = JSON.stringify(aggregatedData);
      const dataHash = generateDataHash(eventDataJson);

      // Store event data
      await env.kv.put('event_data', eventDataJson);

      // Store metadata for caching and diagnostics
      const metadata: AggregationMetadata = {
        lastRunAt: new Date().toISOString(),
        durationMs: result.durationMs,
        groupsProcessed: result.groupsProcessed,
        groupsFailed: result.groupsFailed,
        dataHash,
        errors: result.errors,
      };
      await env.kv.put('aggregation_metadata', JSON.stringify(metadata));

      result.success = true;
      console.log(`Stored ${result.groupsProcessed} groups in KV (hash: ${dataHash})`);
    } catch (error) {
      const errorMsg = `Failed to store data in KV: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  return result;
}
