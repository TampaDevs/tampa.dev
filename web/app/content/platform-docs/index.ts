/**
 * Platform Guide content manifest
 *
 * Maps slugs to MDX components and metadata.
 * Add new platform docs by creating an MDX file and registering it here.
 *
 * Docs are organized by category for sidebar grouping.
 */

import type { ComponentType } from 'react';

// Platform docs
import Overview, { frontmatter as overviewFm } from './overview.mdx';
import ProfileGuide, { frontmatter as profileFm } from './profile-guide.mdx';
import BadgesXp, { frontmatter as badgesFm } from './badges-xp.mdx';
import GroupsGuide, { frontmatter as groupsFm } from './groups-guide.mdx';
import GroupManagement, { frontmatter as groupMgmtFm } from './group-management.mdx';
import EventManagement, { frontmatter as eventMgmtFm } from './event-management.mdx';
import BadgeManagement, { frontmatter as badgeMgmtFm } from './badge-management.mdx';
import McpGuide, { frontmatter as mcpFm } from './mcp-guide.mdx';
import AdminGuide, { frontmatter as adminFm } from './admin-guide.mdx';

export interface PlatformDocEntry {
  slug: string;
  title: string;
  description: string;
  order: number;
  category: string;
  component: ComponentType;
}

/** Sidebar category ordering */
export const PLATFORM_CATEGORIES = [
  'Getting Started',
  'For Users',
  'For Group Managers',
  'For Platform Admins',
] as const;

function entry(slug: string, component: ComponentType, fm: Record<string, unknown>): PlatformDocEntry {
  return {
    slug,
    title: (fm.title as string) || slug,
    description: (fm.description as string) || '',
    order: (fm.order as number) || 99,
    category: (fm.category as string) || 'General',
    component,
  };
}

export const PLATFORM_DOCS: PlatformDocEntry[] = [
  // Getting Started
  entry('overview', Overview, overviewFm),
  // For Users
  entry('profile-guide', ProfileGuide, profileFm),
  entry('badges-xp', BadgesXp, badgesFm),
  entry('groups-guide', GroupsGuide, groupsFm),
  // For Group Managers
  entry('group-management', GroupManagement, groupMgmtFm),
  entry('event-management', EventManagement, eventMgmtFm),
  entry('badge-management', BadgeManagement, badgeMgmtFm),
  entry('mcp-guide', McpGuide, mcpFm),
  // For Platform Admins
  entry('admin-guide', AdminGuide, adminFm),
].sort((a, b) => a.order - b.order);

export const PLATFORM_DOCS_BY_SLUG = Object.fromEntries(PLATFORM_DOCS.map((d) => [d.slug, d]));
