/**
 * Docs content manifest
 *
 * Maps slugs to MDX components and metadata.
 * Add new docs by creating an MDX file and registering it here.
 *
 * Docs are organized by category for sidebar grouping.
 * Set `admin: true` in frontmatter to restrict docs to platform admins.
 */

import type { ComponentType } from 'react';

// Existing docs
import SignInWithTampadev, { frontmatter as signinFm } from './signin-with-tampadev.mdx';
import Authentication, { frontmatter as authFm } from './authentication.mdx';
import Scopes, { frontmatter as scopesFm } from './scopes.mdx';
import ApiReference, { frontmatter as apiFm } from './api-reference.mdx';
import Webhooks, { frontmatter as webhooksFm } from './webhooks.mdx';
import PersonalAccessTokens, { frontmatter as patFm } from './personal-access-tokens.mdx';
import RateLimits, { frontmatter as rateFm } from './rate-limits.mdx';
import Examples, { frontmatter as examplesFm } from './examples.mdx';

// New API Reference sub-pages
import ApiProfile, { frontmatter as apiProfileFm } from './api-profile.mdx';
import ApiEvents, { frontmatter as apiEventsFm } from './api-events.mdx';
import ApiGroups, { frontmatter as apiGroupsFm } from './api-groups.mdx';
import ApiManagement, { frontmatter as apiMgmtFm } from './api-management.mdx';
import ErrorCatalog, { frontmatter as errorCatalogFm } from './error-catalog.mdx';

// MCP docs
import McpOverview, { frontmatter as mcpOverviewFm } from './mcp-overview.mdx';
import McpTools, { frontmatter as mcpToolsFm } from './mcp-tools.mdx';
import McpResources, { frontmatter as mcpResourcesFm } from './mcp-resources.mdx';
import McpPrompts, { frontmatter as mcpPromptsFm } from './mcp-prompts.mdx';
import McpExamples, { frontmatter as mcpExamplesFm } from './mcp-examples.mdx';

// Admin-gated docs
import WebhooksAdmin, { frontmatter as whAdminFm } from './webhooks-admin.mdx';

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  order: number;
  category: string;
  admin?: boolean;
  component: ComponentType;
}

/** Sidebar category ordering */
export const CATEGORIES = [
  'Getting Started',
  'API Reference',
  'MCP',
  'Webhooks',
  'Resources',
] as const;

function entry(slug: string, component: ComponentType, fm: Record<string, unknown>): DocEntry {
  return {
    slug,
    title: (fm.title as string) || slug,
    description: (fm.description as string) || '',
    order: (fm.order as number) || 99,
    category: (fm.category as string) || 'General',
    admin: (fm.admin as boolean) || false,
    component,
  };
}

export const DOCS: DocEntry[] = [
  // Getting Started
  entry('signin-with-tampadev', SignInWithTampadev, signinFm),
  entry('authentication', Authentication, authFm),
  entry('scopes', Scopes, scopesFm),
  entry('personal-access-tokens', PersonalAccessTokens, patFm),
  entry('rate-limits', RateLimits, rateFm),
  // API Reference
  entry('api-reference', ApiReference, apiFm),
  entry('api-profile', ApiProfile, apiProfileFm),
  entry('api-events', ApiEvents, apiEventsFm),
  entry('api-groups', ApiGroups, apiGroupsFm),
  entry('api-management', ApiManagement, apiMgmtFm),
  entry('error-catalog', ErrorCatalog, errorCatalogFm),
  // Webhooks
  entry('webhooks', Webhooks, webhooksFm),
  entry('webhooks-admin', WebhooksAdmin, whAdminFm),
  // MCP
  entry('mcp-overview', McpOverview, mcpOverviewFm),
  entry('mcp-tools', McpTools, mcpToolsFm),
  entry('mcp-resources', McpResources, mcpResourcesFm),
  entry('mcp-prompts', McpPrompts, mcpPromptsFm),
  entry('mcp-examples', McpExamples, mcpExamplesFm),
  // Resources
  entry('examples', Examples, examplesFm),
].sort((a, b) => a.order - b.order);

export const DOCS_BY_SLUG = Object.fromEntries(DOCS.map((d) => [d.slug, d]));
