/**
 * Policy pages content manifest
 *
 * Maps slugs to MDX components and metadata for /policies/* routes.
 */

import type { ComponentType } from 'react';

import PrivacyContent, { frontmatter as privacyFm } from './privacy.mdx';
import TermsContent, { frontmatter as termsFm } from './terms.mdx';

export interface PolicyEntry {
  slug: string;
  title: string;
  description: string;
  h1: string;
  component: ComponentType;
}

function entry(slug: string, component: ComponentType, fm: Record<string, unknown>): PolicyEntry {
  return {
    slug,
    title: (fm.title as string) || slug,
    description: (fm.description as string) || '',
    h1: (fm.h1 as string) || (fm.title as string) || slug,
    component,
  };
}

export const POLICIES: PolicyEntry[] = [
  entry('privacy', PrivacyContent, privacyFm),
  entry('terms', TermsContent, termsFm),
];

export const POLICIES_BY_SLUG = Object.fromEntries(POLICIES.map((p) => [p.slug, p]));
