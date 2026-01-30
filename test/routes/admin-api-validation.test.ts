import { describe, it } from 'mocha';
import { expect } from 'chai';
import { z } from 'zod';

/**
 * Tests for admin API Zod validation schemas.
 * These mirror the schemas defined in src/routes/admin-api.ts
 * to ensure our validation rules are correct.
 */

// Re-create schemas to test validation logic independently
const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  icon: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#E5574F'),
  sortOrder: z.number().int().min(0).optional().default(0),
});

const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const createFlagSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  enabledByDefault: z.boolean().optional().default(false),
});

const updateFlagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  enabledByDefault: z.boolean().optional(),
});

describe('Admin API Validation Schemas', () => {
  describe('Badge Schemas', () => {
    describe('createBadgeSchema', () => {
      it('should accept valid badge data', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Early Adopter',
          slug: 'early-adopter',
          icon: '🚀',
          color: '#E5574F',
        });
        expect(result.success).to.be.true;
      });

      it('should apply default color when not provided', () => {
        const result = createBadgeSchema.parse({
          name: 'Test Badge',
          slug: 'test-badge',
          icon: '✨',
        });
        expect(result.color).to.equal('#E5574F');
      });

      it('should apply default sortOrder of 0', () => {
        const result = createBadgeSchema.parse({
          name: 'Test Badge',
          slug: 'test-badge',
          icon: '✨',
        });
        expect(result.sortOrder).to.equal(0);
      });

      it('should reject empty name', () => {
        const result = createBadgeSchema.safeParse({
          name: '',
          slug: 'test',
          icon: '✨',
        });
        expect(result.success).to.be.false;
      });

      it('should reject invalid slug format', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'Invalid Slug!',
          icon: '✨',
        });
        expect(result.success).to.be.false;
      });

      it('should reject slug with uppercase letters', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'UPPERCASE',
          icon: '✨',
        });
        expect(result.success).to.be.false;
      });

      it('should accept slug with hyphens and numbers', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'test-badge-123',
          icon: '✨',
        });
        expect(result.success).to.be.true;
      });

      it('should reject invalid hex color', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'test',
          icon: '✨',
          color: 'not-a-color',
        });
        expect(result.success).to.be.false;
      });

      it('should accept valid hex color', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'test',
          icon: '✨',
          color: '#FF5733',
        });
        expect(result.success).to.be.true;
      });

      it('should reject missing icon', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'test',
        });
        expect(result.success).to.be.false;
      });

      it('should accept optional description', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'test',
          icon: '✨',
          description: 'Awarded to early community members',
        });
        expect(result.success).to.be.true;
      });

      it('should reject description over 500 chars', () => {
        const result = createBadgeSchema.safeParse({
          name: 'Test',
          slug: 'test',
          icon: '✨',
          description: 'a'.repeat(501),
        });
        expect(result.success).to.be.false;
      });
    });

    describe('updateBadgeSchema', () => {
      it('should accept partial update with name only', () => {
        const result = updateBadgeSchema.safeParse({ name: 'New Name' });
        expect(result.success).to.be.true;
      });

      it('should accept empty object (no updates)', () => {
        const result = updateBadgeSchema.safeParse({});
        expect(result.success).to.be.true;
      });

      it('should accept nullable description', () => {
        const result = updateBadgeSchema.safeParse({ description: null });
        expect(result.success).to.be.true;
      });

      it('should reject invalid slug on update', () => {
        const result = updateBadgeSchema.safeParse({ slug: 'Bad Slug!' });
        expect(result.success).to.be.false;
      });
    });
  });

  describe('Feature Flag Schemas', () => {
    describe('createFlagSchema', () => {
      it('should accept valid flag data', () => {
        const result = createFlagSchema.safeParse({
          name: 'Beta Dashboard',
          slug: 'beta-dashboard',
        });
        expect(result.success).to.be.true;
      });

      it('should default enabledByDefault to false', () => {
        const result = createFlagSchema.parse({
          name: 'Test Flag',
          slug: 'test-flag',
        });
        expect(result.enabledByDefault).to.be.false;
      });

      it('should accept enabledByDefault as true', () => {
        const result = createFlagSchema.parse({
          name: 'Test Flag',
          slug: 'test-flag',
          enabledByDefault: true,
        });
        expect(result.enabledByDefault).to.be.true;
      });

      it('should reject empty name', () => {
        const result = createFlagSchema.safeParse({
          name: '',
          slug: 'test',
        });
        expect(result.success).to.be.false;
      });

      it('should reject invalid slug', () => {
        const result = createFlagSchema.safeParse({
          name: 'Test',
          slug: 'INVALID SLUG',
        });
        expect(result.success).to.be.false;
      });

      it('should accept optional description', () => {
        const result = createFlagSchema.safeParse({
          name: 'Test',
          slug: 'test',
          description: 'Controls access to the new dashboard',
        });
        expect(result.success).to.be.true;
      });

      it('should reject description over 500 chars', () => {
        const result = createFlagSchema.safeParse({
          name: 'Test',
          slug: 'test',
          description: 'x'.repeat(501),
        });
        expect(result.success).to.be.false;
      });

      it('should reject missing slug', () => {
        const result = createFlagSchema.safeParse({
          name: 'Test',
        });
        expect(result.success).to.be.false;
      });
    });

    describe('updateFlagSchema', () => {
      it('should accept partial update', () => {
        const result = updateFlagSchema.safeParse({ name: 'Updated Name' });
        expect(result.success).to.be.true;
      });

      it('should accept empty object', () => {
        const result = updateFlagSchema.safeParse({});
        expect(result.success).to.be.true;
      });

      it('should accept nullable description', () => {
        const result = updateFlagSchema.safeParse({ description: null });
        expect(result.success).to.be.true;
      });

      it('should accept enabledByDefault toggle', () => {
        const result = updateFlagSchema.safeParse({ enabledByDefault: true });
        expect(result.success).to.be.true;
      });

      it('should reject invalid slug', () => {
        const result = updateFlagSchema.safeParse({ slug: 'Bad Slug!' });
        expect(result.success).to.be.false;
      });
    });
  });
});
