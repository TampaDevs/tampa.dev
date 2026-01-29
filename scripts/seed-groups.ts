#!/usr/bin/env tsx
/**
 * Seed Groups Script
 *
 * Imports the existing groups from web/app/data/groups.ts into the D1 database.
 * This script migrates the static configuration to the database with all
 * the new fields (displayOnSite, isFeatured, tags, socialLinks, website).
 *
 * For existing groups (matched by urlname), it updates the site display fields.
 * For new groups, it inserts them.
 *
 * Usage:
 *   npm run db:seed              # Seed to local D1
 *   npm run db:seed -- --remote  # Seed to production D1
 *
 * Options:
 *   --remote    Seed to production database
 *   --dry-run   Show what would be seeded without making changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Parse command line args
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isDryRun = args.includes('--dry-run');

// Import existing groups configuration from web app
import { groups as staticGroups, type LocalGroup } from '../web/app/data/groups.js';

// Eventbrite groups that need platformId mapping
const EVENTBRITE_PLATFORM_IDS: Record<string, string> = {
  'ark-innovation-center': '120311328021',
};

interface GroupSeed {
  urlname: string;
  name: string;
  description: string;
  platform: 'meetup' | 'eventbrite' | 'luma';
  platformId: string;
  link: string;
  website: string | null;
  photoUrl: string | null;
  displayOnSite: boolean;
  isFeatured: boolean;
  tags: string[];
  socialLinks: Record<string, string> | null;
}

/**
 * Determine the platform and platformId for a group
 */
function getPlatformInfo(group: LocalGroup): { platform: 'meetup' | 'eventbrite' | 'luma'; platformId: string; link: string } | null {
  if (group.meetupUrlname) {
    return {
      platform: 'meetup',
      platformId: group.meetupUrlname,
      link: `https://www.meetup.com/${group.meetupUrlname}`,
    };
  }

  // Check if it's an Eventbrite group
  const eventbriteId = EVENTBRITE_PLATFORM_IDS[group.slug];
  if (eventbriteId) {
    return {
      platform: 'eventbrite',
      platformId: eventbriteId,
      link: `https://www.eventbrite.com/o/${eventbriteId}`,
    };
  }

  // Non-synced groups (no platform integration)
  return null;
}

/**
 * Generate seed data for groups from the static configuration
 */
function generateSeedData(): GroupSeed[] {
  const groups: GroupSeed[] = [];

  for (const staticGroup of staticGroups) {
    const platformInfo = getPlatformInfo(staticGroup);

    // Skip groups without platform integration (can't sync events)
    if (!platformInfo) {
      console.log(`  ⚠ Skipping non-synced group: ${staticGroup.slug}`);
      continue;
    }

    groups.push({
      urlname: staticGroup.slug,
      name: staticGroup.name,
      description: staticGroup.description,
      platform: platformInfo.platform,
      platformId: platformInfo.platformId,
      link: platformInfo.link,
      website: staticGroup.website || null,
      photoUrl: staticGroup.logo || null,
      displayOnSite: true, // All groups from static config should display
      isFeatured: staticGroup.featured || false,
      tags: staticGroup.tags,
      socialLinks: staticGroup.socialLinks || null,
    });
  }

  return groups;
}

/**
 * Escape SQL string
 */
function escapeSql(str: string | null): string {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Generate SQL statements for the groups
 * Uses INSERT for new groups and UPDATE for existing ones
 */
function generateSQL(groups: GroupSeed[]): string {
  const statements: string[] = [];
  const now = new Date().toISOString();

  for (const group of groups) {
    const id = crypto.randomUUID();
    const tagsJson = JSON.stringify(group.tags);
    const socialLinksJson = group.socialLinks ? JSON.stringify(group.socialLinks) : null;

    // First, try to UPDATE existing group (matched by platform + platformId)
    // This preserves the existing ID and related data
    statements.push(`
UPDATE groups SET
  name = ${escapeSql(group.name)},
  description = ${escapeSql(group.description)},
  website = ${escapeSql(group.website)},
  photo_url = ${escapeSql(group.photoUrl)},
  display_on_site = ${group.displayOnSite ? 1 : 0},
  is_featured = ${group.isFeatured ? 1 : 0},
  tags = ${escapeSql(tagsJson)},
  social_links = ${escapeSql(socialLinksJson)},
  updated_at = ${escapeSql(now)}
WHERE platform = ${escapeSql(group.platform)} AND platform_id = ${escapeSql(group.platformId)};`);

    // Then, INSERT if not exists (for new groups)
    const columns = [
      'id', 'urlname', 'name', 'description', 'platform', 'platform_id',
      'link', 'website', 'photo_url', 'display_on_site', 'is_featured',
      'tags', 'social_links', 'is_active', 'created_at', 'updated_at'
    ].join(', ');

    const values = [
      escapeSql(id),
      escapeSql(group.urlname),
      escapeSql(group.name),
      escapeSql(group.description),
      escapeSql(group.platform),
      escapeSql(group.platformId),
      escapeSql(group.link),
      escapeSql(group.website),
      escapeSql(group.photoUrl),
      group.displayOnSite ? '1' : '0',
      group.isFeatured ? '1' : '0',
      escapeSql(tagsJson),
      escapeSql(socialLinksJson),
      '1', // is_active
      escapeSql(now),
      escapeSql(now),
    ].join(', ');

    statements.push(`INSERT OR IGNORE INTO groups (${columns}) VALUES (${values});`);
  }

  return statements.join('\n');
}

async function main() {
  console.log('╭──────────────────────────────────────────╮');
  console.log('│      Group Seed Script (Web → D1)        │');
  console.log('╰──────────────────────────────────────────╯\n');

  const target = isRemote ? 'PRODUCTION' : 'LOCAL';
  console.log(`Target: ${target} D1 database`);

  if (isDryRun) {
    console.log('Mode: DRY RUN (no changes will be made)\n');
  }

  console.log(`Source: ${staticGroups.length} groups from web/app/data/groups.ts\n`);

  // Generate seed data
  const groups = generateSeedData();
  console.log(`\nPrepared ${groups.length} groups to seed:\n`);

  // Show group summary by platform
  const byPlatform = groups.reduce((acc, g) => {
    acc[g.platform] = (acc[g.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [platform, count] of Object.entries(byPlatform)) {
    console.log(`  • ${platform}: ${count} groups`);
  }

  const featuredCount = groups.filter(g => g.isFeatured).length;
  console.log(`  • Featured: ${featuredCount} groups`);
  console.log('');

  // Generate SQL
  const sql = generateSQL(groups);

  if (isDryRun) {
    console.log('Generated SQL:\n');
    console.log(sql);
    console.log('\nDry run complete. No changes made.');
    return;
  }

  // Write SQL to temp file
  const sqlFile = path.join(ROOT_DIR, '.seed-groups.sql');
  fs.writeFileSync(sqlFile, sql);
  console.log(`SQL written to ${sqlFile}\n`);

  // Execute via wrangler
  const { execSync } = await import('child_process');
  const remoteFlag = isRemote ? '--remote' : '--local';

  console.log(`Executing seed via wrangler d1 execute...\n`);

  try {
    execSync(
      `npx wrangler d1 execute events-db ${remoteFlag} --file=${sqlFile}`,
      { stdio: 'inherit', cwd: ROOT_DIR }
    );
    console.log('\n✓ Seed complete!');

    // Clean up temp file
    fs.unlinkSync(sqlFile);
  } catch (error) {
    console.error('\n❌ Seed failed');
    // Keep the SQL file for debugging
    console.error(`SQL file preserved at: ${sqlFile}`);
    process.exit(1);
  }

  // Verify
  console.log('\nTo verify, run:');
  console.log(`  npx wrangler d1 execute events-db ${remoteFlag} --command="SELECT urlname, name, display_on_site, is_featured FROM groups WHERE display_on_site = 1 ORDER BY name;"`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
