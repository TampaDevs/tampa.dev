#!/usr/bin/env tsx
/**
 * Seed script for distinct group check-in achievements
 *
 * Creates two achievements:
 * - Stepping Out: Check in to events from 3 different groups
 * - Big Tent: Check in to events from 6 different groups
 *
 * Usage: tsx scripts/seed-distinct-achievements.ts [--local|--remote] [--env staging]
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

async function seedDistinctAchievements() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  const isStaging = args.includes('--env') && args[args.indexOf('--env') + 1] === 'staging';

  let db;
  let dbName = 'events-db';

  if (isStaging) {
    dbName = 'events-db-staging';
  }

  if (isRemote) {
    console.log(`🌐 Connecting to remote ${isStaging ? 'staging' : 'production'} database...`);
    // For remote, we need to use wrangler d1 execute with SQL directly
    // This script is designed to run locally only for now
    console.error('❌ Remote seeding not implemented. Please use the admin API to create achievements remotely.');
    process.exit(1);
  } else {
    console.log('🔧 Connecting to local database...');
    const { getPlatformProxy } = await import('wrangler');
    const { env } = await getPlatformProxy();
    db = drizzle(env.DB, { schema });
  }

  const achievements = [
    {
      key: 'unique_groups_3',
      name: 'Stepping Out',
      description: 'Check in to events from 3 different groups',
      icon: '👣',
      color: '#795548',
      badgeSlug: 'stepping-out',
      targetValue: 3,
      points: 15,
      eventType: 'dev.tampa.event.checkin',
      progressMode: 'distinct' as const,
      gaugeField: 'groupId',
      enabled: 1,
      hidden: 0,
      sortOrder: 0,
    },
    {
      key: 'unique_groups_6',
      name: 'Big Tent',
      description: 'Check in to events from 6 different groups',
      icon: '🎪',
      color: '#F44336',
      badgeSlug: 'big-tent',
      targetValue: 6,
      points: 30,
      eventType: 'dev.tampa.event.checkin',
      progressMode: 'distinct' as const,
      gaugeField: 'groupId',
      enabled: 1,
      hidden: 0,
      sortOrder: 0,
    },
  ];

  for (const achievement of achievements) {
    console.log(`\n📊 Creating achievement: ${achievement.name} (${achievement.key})`);

    // Check if it already exists
    const existing = await db.query.achievements.findFirst({
      where: eq(schema.achievements.key, achievement.key),
    });

    if (existing) {
      console.log(`⏭️  Achievement ${achievement.key} already exists, skipping...`);
      continue;
    }

    // Insert the achievement
    await db.insert(schema.achievements).values({
      id: crypto.randomUUID(),
      ...achievement,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Created achievement: ${achievement.name}`);
  }

  console.log('\n✨ Distinct achievements seeded successfully!');
}

seedDistinctAchievements().catch((error) => {
  console.error('❌ Error seeding achievements:', error);
  process.exit(1);
});
