import { describe, it } from 'mocha';
import { expect } from 'chai';
import { z } from 'zod';

/**
 * Tests for achievement and claim link admin API validation schemas.
 * Mirrors the schemas defined in src/routes/admin-api.ts.
 */

const createAchievementSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Must be lowercase alphanumeric with underscores'),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  targetValue: z.number().int().min(1).default(1),
  points: z.number().int().min(0).optional().default(0),
  badgeSlug: z.string().optional(),
  entitlement: z.string().optional(),
  eventType: z.string().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  conditions: z.string().optional(),
  progressMode: z.enum(['counter', 'gauge']).optional().default('counter'),
  gaugeField: z.string().optional(),
  hidden: z.boolean().optional().default(false),
});

const updateAchievementSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  targetValue: z.number().int().min(1).optional(),
  points: z.number().int().min(0).optional(),
  badgeSlug: z.string().optional().nullable(),
  entitlement: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  conditions: z.string().optional().nullable(),
  progressMode: z.enum(['counter', 'gauge']).optional().nullable(),
  gaugeField: z.string().optional().nullable(),
  hidden: z.boolean().optional(),
});

const claimLinkSchema = z.object({
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  achievementId: z.string().optional(),
  emitEventType: z.string().optional(),
  emitEventPayload: z.string().optional(),
});

describe('Achievement Admin API Validation Schemas', () => {
  describe('createAchievementSchema', () => {
    const validAchievement = {
      key: 'first_checkin',
      name: 'First Check-in',
      description: 'Attend your first event',
    };

    it('should accept valid minimal achievement', () => {
      const result = createAchievementSchema.safeParse(validAchievement);
      expect(result.success).to.be.true;
    });

    it('should default targetValue to 1', () => {
      const result = createAchievementSchema.parse(validAchievement);
      expect(result.targetValue).to.equal(1);
    });

    it('should default points to 0', () => {
      const result = createAchievementSchema.parse(validAchievement);
      expect(result.points).to.equal(0);
    });

    it('should default progressMode to counter', () => {
      const result = createAchievementSchema.parse(validAchievement);
      expect(result.progressMode).to.equal('counter');
    });

    it('should default hidden to false', () => {
      const result = createAchievementSchema.parse(validAchievement);
      expect(result.hidden).to.be.false;
    });

    it('should default sortOrder to 0', () => {
      const result = createAchievementSchema.parse(validAchievement);
      expect(result.sortOrder).to.equal(0);
    });

    it('should reject empty key', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, key: '' });
      expect(result.success).to.be.false;
    });

    it('should reject key with uppercase', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, key: 'FirstCheckin' });
      expect(result.success).to.be.false;
    });

    it('should reject key with hyphens (only underscores allowed)', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, key: 'first-checkin' });
      expect(result.success).to.be.false;
    });

    it('should accept key with underscores and numbers', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, key: 'reach_10_xp' });
      expect(result.success).to.be.true;
    });

    it('should reject empty name', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, name: '' });
      expect(result.success).to.be.false;
    });

    it('should reject empty description', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, description: '' });
      expect(result.success).to.be.false;
    });

    it('should reject description over 500 chars', () => {
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        description: 'x'.repeat(501),
      });
      expect(result.success).to.be.false;
    });

    it('should reject targetValue of 0', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, targetValue: 0 });
      expect(result.success).to.be.false;
    });

    it('should accept targetValue of 1 or more', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, targetValue: 10 });
      expect(result.success).to.be.true;
    });

    it('should reject negative points', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, points: -5 });
      expect(result.success).to.be.false;
    });

    it('should reject invalid color format', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, color: 'red' });
      expect(result.success).to.be.false;
    });

    it('should accept valid hex color', () => {
      const result = createAchievementSchema.safeParse({ ...validAchievement, color: '#FF5733' });
      expect(result.success).to.be.true;
    });

    // Progress mode + gauge field
    it('should accept progressMode counter', () => {
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        progressMode: 'counter',
      });
      expect(result.success).to.be.true;
    });

    it('should accept progressMode gauge', () => {
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        progressMode: 'gauge',
      });
      expect(result.success).to.be.true;
    });

    it('should reject invalid progressMode', () => {
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        progressMode: 'invalid',
      });
      expect(result.success).to.be.false;
    });

    it('should accept gaugeField with gauge mode', () => {
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        progressMode: 'gauge',
        gaugeField: 'totalScore',
      });
      expect(result.success).to.be.true;
    });

    // Hidden flag
    it('should accept hidden as true', () => {
      const result = createAchievementSchema.parse({
        ...validAchievement,
        hidden: true,
      });
      expect(result.hidden).to.be.true;
    });

    // Conditions
    it('should accept conditions as JSON string', () => {
      const conditions = JSON.stringify([
        { field: 'groupSlug', op: 'eq', value: 'tampa-devs' },
      ]);
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        conditions,
      });
      expect(result.success).to.be.true;
    });

    it('should accept missing conditions (optional)', () => {
      const result = createAchievementSchema.safeParse(validAchievement);
      expect(result.success).to.be.true;
    });

    // Full gauge achievement
    it('should accept a complete gauge achievement', () => {
      const result = createAchievementSchema.safeParse({
        ...validAchievement,
        key: 'reach_10_xp',
        name: 'Reach 10 XP',
        description: 'Earn 10 XP by completing achievements and collecting badges',
        targetValue: 10,
        progressMode: 'gauge',
        gaugeField: 'totalScore',
        eventType: 'dev.tampa.user.score_changed',
        conditions: JSON.stringify([{ field: 'totalScore', op: 'gte', value: 10 }]),
        hidden: false,
        points: 5,
      });
      expect(result.success).to.be.true;
    });
  });

  describe('updateAchievementSchema', () => {
    it('should accept empty object (no updates)', () => {
      const result = updateAchievementSchema.safeParse({});
      expect(result.success).to.be.true;
    });

    it('should accept partial update with name only', () => {
      const result = updateAchievementSchema.safeParse({ name: 'New Name' });
      expect(result.success).to.be.true;
    });

    it('should accept nullable conditions', () => {
      const result = updateAchievementSchema.safeParse({ conditions: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable progressMode', () => {
      const result = updateAchievementSchema.safeParse({ progressMode: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable gaugeField', () => {
      const result = updateAchievementSchema.safeParse({ gaugeField: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable icon', () => {
      const result = updateAchievementSchema.safeParse({ icon: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable color', () => {
      const result = updateAchievementSchema.safeParse({ color: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable badgeSlug', () => {
      const result = updateAchievementSchema.safeParse({ badgeSlug: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable entitlement', () => {
      const result = updateAchievementSchema.safeParse({ entitlement: null });
      expect(result.success).to.be.true;
    });

    it('should accept nullable eventType', () => {
      const result = updateAchievementSchema.safeParse({ eventType: null });
      expect(result.success).to.be.true;
    });

    it('should reject invalid key format on update', () => {
      const result = updateAchievementSchema.safeParse({ key: 'Invalid Key!' });
      expect(result.success).to.be.false;
    });

    it('should reject invalid progressMode on update', () => {
      const result = updateAchievementSchema.safeParse({ progressMode: 'invalid' });
      expect(result.success).to.be.false;
    });

    it('should accept hidden update', () => {
      const result = updateAchievementSchema.safeParse({ hidden: true });
      expect(result.success).to.be.true;
    });

    it('should reject targetValue of 0 on update', () => {
      const result = updateAchievementSchema.safeParse({ targetValue: 0 });
      expect(result.success).to.be.false;
    });

    it('should accept conditions update with string', () => {
      const result = updateAchievementSchema.safeParse({
        conditions: JSON.stringify([{ field: 'score', op: 'gte', value: 5 }]),
      });
      expect(result.success).to.be.true;
    });
  });

  describe('claimLinkSchema', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = claimLinkSchema.safeParse({});
      expect(result.success).to.be.true;
    });

    it('should accept maxUses', () => {
      const result = claimLinkSchema.safeParse({ maxUses: 50 });
      expect(result.success).to.be.true;
    });

    it('should reject maxUses of 0', () => {
      const result = claimLinkSchema.safeParse({ maxUses: 0 });
      expect(result.success).to.be.false;
    });

    it('should reject negative maxUses', () => {
      const result = claimLinkSchema.safeParse({ maxUses: -1 });
      expect(result.success).to.be.false;
    });

    it('should accept expiresAt as string', () => {
      const result = claimLinkSchema.safeParse({ expiresAt: '2026-12-31T23:59:59Z' });
      expect(result.success).to.be.true;
    });

    it('should accept achievementId', () => {
      const result = claimLinkSchema.safeParse({ achievementId: 'abc-123' });
      expect(result.success).to.be.true;
    });

    // Custom event emission fields
    it('should accept emitEventType', () => {
      const result = claimLinkSchema.safeParse({
        emitEventType: 'dev.tampa.event.checkin',
      });
      expect(result.success).to.be.true;
    });

    it('should accept emitEventPayload as JSON string', () => {
      const result = claimLinkSchema.safeParse({
        emitEventPayload: '{"groupSlug": "tampa-devs"}',
      });
      expect(result.success).to.be.true;
    });

    it('should accept both emitEventType and emitEventPayload', () => {
      const result = claimLinkSchema.safeParse({
        emitEventType: 'dev.tampa.event.checkin',
        emitEventPayload: '{"groupSlug": "tampa-devs"}',
      });
      expect(result.success).to.be.true;
    });

    it('should accept a full claim link with all fields', () => {
      const result = claimLinkSchema.safeParse({
        maxUses: 100,
        expiresAt: '2026-06-01T00:00:00Z',
        achievementId: 'ach-1',
        emitEventType: 'dev.tampa.event.checkin',
        emitEventPayload: '{"groupSlug": "tampa-devs", "eventName": "Monthly Meetup"}',
      });
      expect(result.success).to.be.true;
    });
  });
});
