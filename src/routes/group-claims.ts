/**
 * Group Claim Routes
 *
 * Public endpoints for claiming ownership of synced groups via invite
 * tokens or direct claim requests. Admin review endpoints are in admin-api.ts.
 *
 * Mounted at /groups in the main app (before registerGroupRoutes so
 * /groups/claim/:token doesn't get caught by /groups/:slug).
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  groups,
  groupMembers,
  groupClaimInvites,
  groupClaimRequests,
  GroupMemberRole,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireScope } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';

export function createGroupClaimRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /groups/claim/:token - Group info for claim invite (no auth)
   */
  app.get('/claim/:token', async (c) => {
    const token = c.req.param('token');
    const db = createDatabase(c.env.DB);

    const invite = await db.query.groupClaimInvites.findFirst({
      where: eq(groupClaimInvites.token, token),
    });

    if (!invite) {
      return c.json({ error: 'Claim invite not found' }, 404);
    }

    // Check if already used
    if (invite.usedBy) {
      return c.json({ error: 'This claim invite has already been used' }, 410);
    }

    // Check expiration
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return c.json({ error: 'This claim invite has expired' }, 410);
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, invite.groupId),
    });
    if (!group) return c.json({ error: 'Group not found' }, 404);

    return c.json({
      group: {
        id: group.id,
        name: group.name,
        urlname: group.urlname,
        description: group.description,
        photoUrl: group.photoUrl,
        platform: group.platform,
      },
      autoApprove: invite.autoApprove,
      claimable: true,
    });
  });

  /**
   * POST /groups/claim/:token - Accept a claim invite (auth required)
   * If autoApprove → create owner membership immediately.
   * Otherwise → create pending claim request.
   */
  app.post('/claim/:token', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const token = c.req.param('token');
    const db = createDatabase(c.env.DB);

    const invite = await db.query.groupClaimInvites.findFirst({
      where: eq(groupClaimInvites.token, token),
    });

    if (!invite) {
      return c.json({ error: 'Claim invite not found' }, 404);
    }

    if (invite.usedBy) {
      return c.json({ error: 'This claim invite has already been used' }, 410);
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return c.json({ error: 'This claim invite has expired' }, 410);
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, invite.groupId),
    });
    if (!group) return c.json({ error: 'Group not found' }, 404);

    const now = new Date().toISOString();

    // Mark invite as used
    await db.update(groupClaimInvites).set({
      usedBy: user.id,
      usedAt: now,
    }).where(eq(groupClaimInvites.id, invite.id));

    if (invite.autoApprove) {
      // Auto-approve: add or upgrade to owner
      const existingMember = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, invite.groupId),
          eq(groupMembers.userId, user.id),
        ),
      });

      if (!existingMember) {
        await db.insert(groupMembers).values({
          id: crypto.randomUUID(),
          groupId: invite.groupId,
          userId: user.id,
          role: GroupMemberRole.OWNER,
        });
      } else if (existingMember.role !== GroupMemberRole.OWNER) {
        await db.update(groupMembers).set({
          role: GroupMemberRole.OWNER,
        }).where(eq(groupMembers.id, existingMember.id));
      }

      emitEvent(c, {
        type: 'dev.tampa.group.claimed',
        payload: {
          groupId: invite.groupId,
          userId: user.id,
          method: 'invite',
          autoApproved: true,
        },
        metadata: { userId: user.id, source: 'group-claims' },
      });

      return c.json({
        success: true,
        status: 'approved',
        message: 'Group claimed successfully. You are now an owner.',
      });
    } else {
      // Create pending claim request
      const requestId = crypto.randomUUID();
      await db.insert(groupClaimRequests).values({
        id: requestId,
        groupId: invite.groupId,
        userId: user.id,
        status: 'pending',
        notes: 'Claim via invite token',
        createdAt: now,
      });

      return c.json({
        success: true,
        status: 'pending',
        message: 'Claim request submitted. An admin will review it.',
        requestId,
      });
    }
  });

  /**
   * POST /groups/:groupId/claim - Submit a claim request without an invite (auth required)
   */
  app.post('/:groupId/claim', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const groupId = c.req.param('groupId');
    const db = createDatabase(c.env.DB);

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return c.json({ error: 'Group not found' }, 404);

    // Check for existing pending request
    const existingRequest = await db.query.groupClaimRequests.findFirst({
      where: and(
        eq(groupClaimRequests.groupId, groupId),
        eq(groupClaimRequests.userId, user.id),
        eq(groupClaimRequests.status, 'pending'),
      ),
    });
    if (existingRequest) {
      return c.json({ error: 'You already have a pending claim request for this group' }, 409);
    }

    // Check if user is already an owner
    const existingOwnership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id),
        eq(groupMembers.role, GroupMemberRole.OWNER),
      ),
    });
    if (existingOwnership) {
      return c.json({ error: 'You are already an owner of this group' }, 409);
    }

    // Parse optional notes from body
    let notes: string | null = null;
    try {
      const body = await c.req.json();
      if (body.notes && typeof body.notes === 'string') notes = body.notes;
    } catch {
      // No body
    }

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(groupClaimRequests).values({
      id: requestId,
      groupId,
      userId: user.id,
      status: 'pending',
      notes,
      createdAt: now,
    });

    emitEvent(c, {
      type: 'dev.tampa.group.creation_requested',
      payload: {
        requestId,
        groupId,
        userId: user.id,
        type: 'claim',
      },
      metadata: { userId: user.id, source: 'group-claims' },
    });

    return c.json({
      success: true,
      status: 'pending',
      message: 'Claim request submitted. An admin will review it.',
      requestId,
    }, 201);
  });

  return app;
}

export const groupClaimRoutes = createGroupClaimRoutes();
