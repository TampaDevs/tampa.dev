/**
 * Admin docs content manifest
 *
 * Maps slugs to MDX components and metadata.
 * These docs are only shown in the admin panel (auth-protected).
 */

import type { ComponentType } from 'react';

import Webhooks, { frontmatter as webhooksFm } from './webhooks.mdx';

export interface AdminDocEntry {
  slug: string;
  title: string;
  description: string;
  order: number;
  component: ComponentType;
}

function entry(slug: string, component: ComponentType, fm: Record<string, unknown>): AdminDocEntry {
  return {
    slug,
    title: (fm.title as string) || slug,
    description: (fm.description as string) || '',
    order: (fm.order as number) || 99,
    component,
  };
}

export const ADMIN_DOCS: AdminDocEntry[] = [
  entry('webhooks', Webhooks, webhooksFm),
].sort((a, b) => a.order - b.order);

export const ADMIN_DOCS_BY_SLUG = Object.fromEntries(ADMIN_DOCS.map((d) => [d.slug, d]));
