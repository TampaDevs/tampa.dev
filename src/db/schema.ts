import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============== ENUMS (as const objects for type safety) ==============

export const EventPlatform = {
  MEETUP: 'meetup',
  EVENTBRITE: 'eventbrite',
  LUMA: 'luma',
  TAMPA_DEV: 'tampa.dev',
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
  // Badge governance limits (configurable by platform admin)
  maxBadges: integer('max_badges').notNull().default(10),
  maxBadgePoints: integer('max_badge_points').notNull().default(50),
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


// ============== GROUP PLATFORM CONNECTIONS ==============

export const groupPlatformConnections = sqliteTable('group_platform_connections', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  platformId: text('platform_id').notNull(),
  platformUrlname: text('platform_urlname'),
  platformLink: text('platform_link'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastSyncAt: text('last_sync_at'),
  syncError: text('sync_error'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('gpc_group_idx').on(table.groupId),
  uniqueIndex('gpc_platform_id_idx').on(table.platform, table.platformId),
  index('gpc_active_idx').on(table.isActive),
]);

export type GroupPlatformConnection = typeof groupPlatformConnections.$inferSelect;
export type NewGroupPlatformConnection = typeof groupPlatformConnections.$inferInsert;

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
  createdBy: text('created_by').references(() => users.id),
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
  heroImageUrl: text('hero_image_url'),
  themeColor: text('theme_color'),
  location: text('location'), // Freeform location (e.g., "Tampa, FL")
  role: text('role').notNull().default('user'), // user, admin, superadmin
  showAchievements: integer('show_achievements', { mode: 'boolean' }).notNull().default(true),
  profileVisibility: text('profile_visibility').notNull().default('private'), // 'public' | 'private'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
  uniqueIndex('users_username_idx').on(table.username),
  index('users_profile_visibility_idx').on(table.profileVisibility),
  index('users_role_idx').on(table.role),
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
  points: integer('points').notNull().default(0), // XP value for scoring
  sortOrder: integer('sort_order').notNull().default(0),
  hideFromDirectory: integer('hide_from_directory').notNull().default(0),
  groupId: text('group_id').references(() => groups.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('badges_slug_idx').on(table.slug),
  index('badges_group_idx').on(table.groupId),
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
  MANAGER: 'manager',
  VOLUNTEER: 'volunteer',
  MEMBER: 'member',
} as const;

export type GroupMemberRoleType = (typeof GroupMemberRole)[keyof typeof GroupMemberRole];

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner, manager, volunteer, member
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

// ============== ACHIEVEMENTS (definitions) ==============

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon'), // Emoji (e.g. "🔍")
  color: text('color'), // Hex color (e.g. "#4CAF50")
  targetValue: integer('target_value').notNull().default(1),
  badgeSlug: text('badge_slug'), // Auto-award this badge on completion
  points: integer('points').notNull().default(0), // XP value awarded on completion
  entitlement: text('entitlement'), // Auto-grant this entitlement on completion
  eventType: text('event_type'), // Domain event that increments this achievement
  conditions: text('conditions'), // JSON: Condition[] payload matchers (AND logic)
  progressMode: text('progress_mode'), // 'counter' (default) | 'gauge'
  gaugeField: text('gauge_field'), // For gauge mode: payload field dot-path
  hidden: integer('hidden').notNull().default(0), // 1 = hidden achievement (Xbox/PSN style)
  enabled: integer('enabled').notNull().default(1), // 1 = active, 0 = disabled (skipped by queue)
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('achievements_key_idx').on(table.key),
  index('achievements_event_type_idx').on(table.eventType),
]);

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

// ============== BADGE CLAIM LINKS ==============

export const badgeClaimLinks = sqliteTable('badge_claim_links', {
  id: text('id').primaryKey(),
  badgeId: text('badge_id').notNull().references(() => badges.id),
  code: text('code').notNull(),
  maxUses: integer('max_uses'), // NULL = unlimited
  currentUses: integer('current_uses').notNull().default(0),
  expiresAt: text('expires_at'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  achievementId: text('achievement_id').references(() => achievements.id), // Optional: complete this achievement on claim
  emitEventType: text('emit_event_type'), // Custom domain event to emit on claim
  emitEventPayload: text('emit_event_payload'), // JSON: additional payload fields for custom event
}, (table) => [
  uniqueIndex('badge_claim_links_code_idx').on(table.code),
  index('badge_claim_links_badge_idx').on(table.badgeId),
]);

export type BadgeClaimLink = typeof badgeClaimLinks.$inferSelect;
export type NewBadgeClaimLink = typeof badgeClaimLinks.$inferInsert;

// ============== USER FOLLOWS ==============

export const userFollows = sqliteTable('user_follows', {
  followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followedId: text('followed_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('user_follows_followed_idx').on(table.followedId),
]);

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;

// ============== ONBOARDING STEPS ==============

export const onboardingSteps = sqliteTable('onboarding_steps', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  eventKey: text('event_key'), // Domain event that auto-completes this step
}, (table) => [
  uniqueIndex('onboarding_steps_key_idx').on(table.key),
]);

export type OnboardingStep = typeof onboardingSteps.$inferSelect;
export type NewOnboardingStep = typeof onboardingSteps.$inferInsert;

// ============== USER ONBOARDING ==============

export const userOnboarding = sqliteTable('user_onboarding', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stepKey: text('step_key').notNull(),
  completedAt: text('completed_at'),
  dismissed: integer('dismissed').notNull().default(0),
}, (table) => [
  uniqueIndex('user_onboarding_user_step_idx').on(table.userId, table.stepKey),
]);

// ============== EVENT RSVPS ==============

export const eventRsvps = sqliteTable('event_rsvps', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('confirmed'), // confirmed, waitlisted, cancelled
  rsvpAt: text('rsvp_at').notNull().default(sql`(datetime('now'))`),
  waitlistPosition: integer('waitlist_position'),
  cancelledAt: text('cancelled_at'),
}, (table) => [
  index('event_rsvps_event_idx').on(table.eventId),
  index('event_rsvps_user_idx').on(table.userId),
  uniqueIndex('event_rsvps_event_user_idx').on(table.eventId, table.userId),
]);

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type NewEventRsvp = typeof eventRsvps.$inferInsert;

// ============== EVENT CHECKIN CODES ==============

export const eventCheckinCodes = sqliteTable('event_checkin_codes', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').notNull().default(0),
  expiresAt: text('expires_at'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('event_checkin_codes_code_idx').on(table.code),
  index('event_checkin_codes_event_idx').on(table.eventId),
]);

export type EventCheckinCode = typeof eventCheckinCodes.$inferSelect;
export type NewEventCheckinCode = typeof eventCheckinCodes.$inferInsert;

// ============== EVENT CHECKINS ==============

export const eventCheckins = sqliteTable('event_checkins', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  checkinCodeId: text('checkin_code_id').references(() => eventCheckinCodes.id),
  method: text('method').notNull().default('link'), // link, qr, nfc
  checkedInAt: text('checked_in_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('event_checkins_event_user_idx').on(table.eventId, table.userId),
  index('event_checkins_event_idx').on(table.eventId),
]);

export type EventCheckin = typeof eventCheckins.$inferSelect;
export type NewEventCheckin = typeof eventCheckins.$inferInsert;

// ============== GROUP CLAIM REQUESTS ==============

export const groupClaimRequests = sqliteTable('group_claim_requests', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  notes: text('notes'),
  // Scaffolding for future Meetup/Eventbrite API verification when sign-in-with-platform
  // is implemented. The claim review UI can display verification results to the reviewing
  // admin. For now this remains NULL.
  verificationData: text('verification_data'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('gcr_group_idx').on(table.groupId),
  index('gcr_user_idx').on(table.userId),
  index('gcr_status_idx').on(table.status),
]);

export type GroupClaimRequest = typeof groupClaimRequests.$inferSelect;
export type NewGroupClaimRequest = typeof groupClaimRequests.$inferInsert;

// ============== GROUP CLAIM INVITES ==============

export const groupClaimInvites = sqliteTable('group_claim_invites', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  autoApprove: integer('auto_approve', { mode: 'boolean' }).notNull().default(false),
  expiresAt: text('expires_at'),
  createdBy: text('created_by').notNull().references(() => users.id),
  usedBy: text('used_by').references(() => users.id),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('gci_token_idx').on(table.token),
  index('gci_group_idx').on(table.groupId),
]);

export type GroupClaimInvite = typeof groupClaimInvites.$inferSelect;
export type NewGroupClaimInvite = typeof groupClaimInvites.$inferInsert;

// ============== GROUP CREATION REQUESTS ==============

export const groupCreationRequests = sqliteTable('group_creation_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupName: text('group_name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  groupId: text('group_id').references(() => groups.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('gcreq_user_idx').on(table.userId),
  index('gcreq_status_idx').on(table.status),
]);

export type GroupCreationRequest = typeof groupCreationRequests.$inferSelect;
export type NewGroupCreationRequest = typeof groupCreationRequests.$inferInsert;

// ============== OAuth Client Registry ==============
// Tracks OAuth client registrations (both DCR and developer portal) in D1
// for efficient lifecycle management and automated cleanup.

export const oauthClientRegistry = sqliteTable('oauth_client_registry', {
  clientId: text('client_id').primaryKey(),
  source: text('source').notNull(), // 'dcr' | 'developer_portal'
  ownerId: text('owner_id'),
  clientName: text('client_name'),
  registeredAt: text('registered_at').notNull().default(sql`(datetime('now'))`),
  lastGrantAt: text('last_grant_at'),
}, (table) => [
  index('ocr_source_idx').on(table.source),
  index('ocr_owner_idx').on(table.ownerId),
  index('ocr_registered_at_idx').on(table.registeredAt),
  index('ocr_last_grant_at_idx').on(table.lastGrantAt),
  index('ocr_source_registered_idx').on(table.source, table.registeredAt),
  index('ocr_source_last_grant_idx').on(table.source, table.lastGrantAt),
]);

export type OAuthClientRegistryEntry = typeof oauthClientRegistry.$inferSelect;
export type NewOAuthClientRegistryEntry = typeof oauthClientRegistry.$inferInsert;

/**
 * OAuth Grants Tracking Table
 *
 * Tracks active OAuth grants (authorizations) in D1, providing:
 * 1. Efficient lookup of grants by clientId for app deletion
 * 2. Deduplication - only one grant per user/client pair
 * 3. Reliable revocation without depending on KV list() eventual consistency
 *
 * This table mirrors grant data stored in KV but is the authoritative
 * source for grant-to-client relationships.
 */
export const oauthGrants = sqliteTable('oauth_grants', {
  // The grantId portion of the KV key (e.g., "abc123def456")
  grantId: text('grant_id').primaryKey(),
  // The user who authorized the app
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // The client (app) that was authorized
  clientId: text('client_id').notNull(),
  // Full KV key for direct deletion: "grant:{userId}:{grantId}"
  grantKey: text('grant_key').notNull(),
  // Granted scopes (JSON array)
  scopes: text('scopes').notNull(),
  // When the grant was created
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('og_user_idx').on(table.userId),
  index('og_client_idx').on(table.clientId),
  // Unique constraint ensures only one grant per user/client pair
  uniqueIndex('og_user_client_idx').on(table.userId, table.clientId),
]);

export type OAuthGrant = typeof oauthGrants.$inferSelect;
export type NewOAuthGrant = typeof oauthGrants.$inferInsert;
