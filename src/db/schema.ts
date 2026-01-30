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
  username: text('username'), // Unique username for public profile URL (/p/:username)
  bio: text('bio'), // Short bio/description (max 500 chars enforced at app layer)
  socialLinks: text('social_links'), // JSON: { github?, twitter?, linkedin?, website?, discord? }
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'), // user, admin, superadmin
  showAchievements: integer('show_achievements', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
  uniqueIndex('users_username_idx').on(table.username),
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
  providerEmail: text('provider_email'), // Email from this provider
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

// ============== BADGES ==============

export const badges = sqliteTable('badges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  icon: text('icon').notNull(), // Emoji or icon identifier
  color: text('color').notNull().default('#E5574F'), // Hex color
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('badges_slug_idx').on(table.slug),
]);

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;

// ============== USER BADGES ==============

export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  awardedAt: text('awarded_at').notNull().default(sql`(datetime('now'))`),
  awardedBy: text('awarded_by').references(() => users.id),
}, (table) => [
  index('user_badges_user_idx').on(table.userId),
  uniqueIndex('user_badges_user_badge_idx').on(table.userId, table.badgeId),
]);

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;

// ============== USER PORTFOLIO ITEMS ==============

export const userPortfolioItems = sqliteTable('user_portfolio_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  url: text('url'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('user_portfolio_user_idx').on(table.userId),
]);

export type UserPortfolioItem = typeof userPortfolioItems.$inferSelect;
export type NewUserPortfolioItem = typeof userPortfolioItems.$inferInsert;

// ============== GROUP MEMBERS ==============

export const GroupMemberRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type GroupMemberRoleType = (typeof GroupMemberRole)[keyof typeof GroupMemberRole];

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner, admin, member
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('group_members_group_idx').on(table.groupId),
  index('group_members_user_idx').on(table.userId),
  uniqueIndex('group_members_group_user_idx').on(table.groupId, table.userId),
]);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;

// ============== API TOKENS ==============

export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(),
  tokenPrefix: text('token_prefix').notNull(),
  scopes: text('scopes').notNull().default('[]'), // JSON array of scope strings
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('api_tokens_user_idx').on(table.userId),
  uniqueIndex('api_tokens_hash_idx').on(table.tokenHash),
]);

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;

// ============== FEATURE FLAGS ==============

export const featureFlags = sqliteTable('feature_flags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  enabledByDefault: integer('enabled_by_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('feature_flags_slug_idx').on(table.slug),
]);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;

// ============== USER FEATURE FLAGS ==============

export const userFeatureFlags = sqliteTable('user_feature_flags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  flagId: text('flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('user_feature_flags_user_flag_idx').on(table.userId, table.flagId),
]);

export type UserFeatureFlag = typeof userFeatureFlags.$inferSelect;
export type NewUserFeatureFlag = typeof userFeatureFlags.$inferInsert;

// ============== GROUP FEATURE FLAGS ==============

export const groupFeatureFlags = sqliteTable('group_feature_flags', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  flagId: text('flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('group_feature_flags_group_flag_idx').on(table.groupId, table.flagId),
]);

export type GroupFeatureFlag = typeof groupFeatureFlags.$inferSelect;
export type NewGroupFeatureFlag = typeof groupFeatureFlags.$inferInsert;

// ============== WEBHOOKS ==============

export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  eventTypes: text('event_types').notNull().default('["*"]'), // JSON array of event type strings
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('webhooks_user_idx').on(table.userId),
]);

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

// ============== WEBHOOK DELIVERIES ==============

export const webhookDeliveries = sqliteTable('webhook_deliveries', {
  id: text('id').primaryKey(),
  webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  payload: text('payload').notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  attempt: integer('attempt').notNull().default(1),
  deliveredAt: text('delivered_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('webhook_deliveries_webhook_idx').on(table.webhookId),
  index('webhook_deliveries_delivered_idx').on(table.deliveredAt),
]);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;

// ============== USER ENTITLEMENTS ==============

export const userEntitlements = sqliteTable('user_entitlements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entitlement: text('entitlement').notNull(),
  grantedAt: text('granted_at').notNull().default(sql`(datetime('now'))`),
  expiresAt: text('expires_at'),
  source: text('source').notNull().default('system'), // system, achievement, admin
}, (table) => [
  index('user_entitlements_user_idx').on(table.userId),
  uniqueIndex('user_entitlements_user_ent_idx').on(table.userId, table.entitlement),
]);

export type UserEntitlement = typeof userEntitlements.$inferSelect;
export type NewUserEntitlement = typeof userEntitlements.$inferInsert;

// ============== ACHIEVEMENT PROGRESS ==============

export const achievementProgress = sqliteTable('achievement_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementKey: text('achievement_key').notNull(),
  currentValue: integer('current_value').notNull().default(0),
  targetValue: integer('target_value').notNull(),
  completedAt: text('completed_at'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('achievement_progress_user_idx').on(table.userId),
  uniqueIndex('achievement_progress_user_key_idx').on(table.userId, table.achievementKey),
]);

export type AchievementProgress = typeof achievementProgress.$inferSelect;
export type NewAchievementProgress = typeof achievementProgress.$inferInsert;
