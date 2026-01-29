import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============== ENUMS (as const objects for type safety) ==============

export const EventPlatform = {
  MEETUP: 'meetup',
  EVENTBRITE: 'eventbrite',
  LUMA: 'luma',
} as const;

export type EventPlatformType = (typeof EventPlatform)[keyof typeof EventPlatform];

export const EventStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  DRAFT: 'draft',
} as const;

export type EventStatusType = (typeof EventStatus)[keyof typeof EventStatus];

export const EventType = {
  PHYSICAL: 'physical',
  ONLINE: 'online',
  HYBRID: 'hybrid',
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const SyncStatus = {
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type SyncStatusType = (typeof SyncStatus)[keyof typeof SyncStatus];

// ============== GROUPS ==============

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(), // Internal UUID
  platform: text('platform').notNull(), // meetup, eventbrite, luma
  platformId: text('platform_id').notNull(), // ID on the platform
  urlname: text('urlname').notNull(), // Unique slug (e.g., "tampadevs")
  name: text('name').notNull(),
  description: text('description'),
  link: text('link').notNull(), // URL to group page on platform
  website: text('website'), // Group's own website URL (if different from link)
  memberCount: integer('member_count').default(0),
  photoUrl: text('photo_url'),
  // Site display configuration
  displayOnSite: integer('display_on_site', { mode: 'boolean' }).default(false), // Show on public site
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false), // Featured on homepage
  tags: text('tags'), // JSON array of tags (e.g., ["cloud", "aws"])
  socialLinks: text('social_links'), // JSON object with social media links
  // Sync configuration
  isActive: integer('is_active', { mode: 'boolean' }).default(true), // Include in sync jobs
  lastSyncAt: text('last_sync_at'), // ISO 8601
  syncError: text('sync_error'), // Last error if any
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('groups_platform_idx').on(table.platform),
  uniqueIndex('groups_urlname_idx').on(table.urlname),
  index('groups_platform_id_idx').on(table.platform, table.platformId),
  index('groups_display_on_site_idx').on(table.displayOnSite),
]);

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

// ============== VENUES ==============

export const venues = sqliteTable('venues', {
  id: text('id').primaryKey(), // Internal UUID
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  // For deduplication
  platformVenueId: text('platform_venue_id'), // Original venue ID from platform
  platform: text('platform'), // Which platform this venue came from
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('venues_city_idx').on(table.city),
  index('venues_platform_venue_idx').on(table.platform, table.platformVenueId),
]);

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

// ============== EVENTS ==============

export const events = sqliteTable('events', {
  id: text('id').primaryKey(), // Internal UUID
  platform: text('platform').notNull(),
  platformId: text('platform_id').notNull(), // ID on the platform
  groupId: text('group_id').notNull().references(() => groups.id),
  venueId: text('venue_id').references(() => venues.id),
  title: text('title').notNull(),
  description: text('description'),
  eventUrl: text('event_url').notNull(),
  photoUrl: text('photo_url'),
  startTime: text('start_time').notNull(), // ISO 8601 with timezone
  endTime: text('end_time'), // ISO 8601 with timezone
  timezone: text('timezone').notNull(), // IANA timezone
  duration: text('duration'), // ISO 8601 duration (PT2H30M)
  status: text('status').notNull().default('active'),
  eventType: text('event_type').default('physical'), // physical, online, hybrid
  rsvpCount: integer('rsvp_count').default(0),
  maxAttendees: integer('max_attendees'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  lastSyncAt: text('last_sync_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('events_platform_idx').on(table.platform),
  uniqueIndex('events_platform_id_idx').on(table.platform, table.platformId),
  index('events_group_idx').on(table.groupId),
  index('events_start_time_idx').on(table.startTime),
  index('events_status_idx').on(table.status),
]);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// ============== SYNC LOGS ==============

export const syncLogs = sqliteTable('sync_logs', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(),
  groupId: text('group_id').references(() => groups.id),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  status: text('status').notNull(), // running, success, failed
  eventsCreated: integer('events_created').default(0),
  eventsUpdated: integer('events_updated').default(0),
  eventsDeleted: integer('events_deleted').default(0),
  error: text('error'),
}, (table) => [
  index('sync_logs_platform_idx').on(table.platform),
  index('sync_logs_started_at_idx').on(table.startedAt),
]);

export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;

// ============== USERS (for OAuth) ==============

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Internal UUID
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'), // user, admin, superadmin
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============== USER IDENTITIES (multiple OAuth providers) ==============

export const userIdentities = sqliteTable('user_identities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // github, google, discord, etc.
  providerUserId: text('provider_user_id').notNull(),
  providerUsername: text('provider_username'),
  accessToken: text('access_token'), // Encrypted in production
  refreshToken: text('refresh_token'), // Encrypted in production
  tokenExpiresAt: text('token_expires_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('user_identities_user_idx').on(table.userId),
  uniqueIndex('user_identities_provider_idx').on(table.provider, table.providerUserId),
]);

export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;

// ============== SESSIONS ==============

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // Session token
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('sessions_user_idx').on(table.userId),
  index('sessions_expires_idx').on(table.expiresAt),
]);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ============== USER FAVORITES ==============

export const userFavorites = sqliteTable('user_favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('user_favorites_user_idx').on(table.userId),
  index('user_favorites_group_idx').on(table.groupId),
  uniqueIndex('user_favorites_user_group_idx').on(table.userId, table.groupId),
]);

export type UserFavorite = typeof userFavorites.$inferSelect;
export type NewUserFavorite = typeof userFavorites.$inferInsert;
