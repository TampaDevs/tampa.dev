/**
 * Docs content manifest
 *
 * Maps slugs to MDX components and metadata.
 * Add new docs by creating an MDX file and registering it here.
 * This pattern is reusable for future content sections (e.g., blog, guides).
 */

import type { ComponentType } from 'react';

import Authentication, { frontmatter as authFm } from './authentication.mdx';
import Scopes, { frontmatter as scopesFm } from './scopes.mdx';
import ApiReference, { frontmatter as apiFm } from './api-reference.mdx';
import Webhooks, { frontmatter as webhooksFm } from './webhooks.mdx';
import PersonalAccessTokens, { frontmatter as patFm } from './personal-access-tokens.mdx';
import RateLimits, { frontmatter as rateFm } from './rate-limits.mdx';
import Examples, { frontmatter as examplesFm } from './examples.mdx';

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  order: number;
  component: ComponentType;
}

function entry(slug: string, component: ComponentType, fm: Record<string, unknown>): DocEntry {
  return {
    slug,
    title: (fm.title as string) || slug,
    description: (fm.description as string) || '',
    order: (fm.order as number) || 99,
    component,
  };
}

export const DOCS: DocEntry[] = [
  entry('authentication', Authentication, authFm),
  entry('scopes', Scopes, scopesFm),
  entry('api-reference', ApiReference, apiFm),
  entry('webhooks', Webhooks, webhooksFm),
  entry('personal-access-tokens', PersonalAccessTokens, patFm),
  entry('rate-limits', RateLimits, rateFm),
  entry('examples', Examples, examplesFm),
].sort((a, b) => a.order - b.order);

export const DOCS_BY_SLUG = Object.fromEntries(DOCS.map((d) => [d.slug, d]));
