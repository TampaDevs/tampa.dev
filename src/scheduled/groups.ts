/**
 * Groups Configuration
 *
 * List of groups to fetch events from, organized by platform.
 * This configuration can be extended to support multiple platforms in the future.
 */

import type { GroupConfig } from './platforms/base.js';
export type { GroupConfig };

/**
 * Meetup groups to fetch events from
 * These are the URL names (urlname) of each Meetup group
 */
export const MEETUP_GROUPS: string[] = [
  'tampadevs',
  'Tampa-Artificial-Intelligence-Meetup',
  'tampa-bay-techies',
  'High-Tech-Connect',
  'Tampa-DevOps-Meetup',
  'tampabayplatformengineering',
  'tampa-bay-python',
  'tampa-software-qa-and-testing-meetup',
  'tampa-jug',
  'tampa-bay-aws',
  'microsoft-azure-tampa',
  'tampa-bay-women-in-agile',
  'tampa-bay-agile',
  'tampa-bay-google-cloud-user-group',
  'tampa-hackerspace',
  'project-codex',
  'tampa-bay-data-engineering-group',
  'techsuccessnetwork',
  'vue-js-tampa-bay',
  'tampabaydesigners',
  'Design-St-Pete',
  'Homebrew-Hillsborough',
  'tampa-machine-learning',
  'tampa-bay-product-group',
  'tampa-m365',
  'dataanalyticstampa',
  'tipsy-techies-happy-hour',
  'tampa-artificial-intelligence-applications-meetup-group',
  'tampa-bay-innovation-hub',
  'tampa-bay-generative-ai-meetup',
];

/**
 * Get all groups to fetch, with their platform configuration
 */
export function getAllGroups(): GroupConfig[] {
  return MEETUP_GROUPS.map((urlname) => ({
    urlname,
    platform: 'meetup',
    maxEvents: 25,
  }));
}

/**
 * Get groups for a specific platform
 */
export function getGroupsByPlatform(platform: string): GroupConfig[] {
  return getAllGroups().filter((g) => g.platform === platform);
}
