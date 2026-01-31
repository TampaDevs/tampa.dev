/**
 * SEO pages content manifest
 *
 * Maps slugs to MDX components and metadata.
 * Add new pages by creating an MDX file and registering it here.
 * Follows the same pattern as content/docs/index.ts.
 */

import type { ComponentType } from 'react';

import TampaBayTechEvents, { frontmatter as tampaBayFm } from './tampa-bay-tech-events.mdx';
import TampaDeveloperMeetups, { frontmatter as devMeetupsFm } from './tampa-developer-meetups.mdx';
import StPetersburgTechEvents, { frontmatter as stPeteFm } from './st-petersburg-tech-events.mdx';
import ClearwaterTechEvents, { frontmatter as clearwaterFm } from './clearwater-tech-events.mdx';
import TampaAiMeetups, { frontmatter as aiFm } from './tampa-ai-meetups.mdx';
import TampaStartupEvents, { frontmatter as startupFm } from './tampa-startup-events.mdx';
import TampaFounderMeetups, { frontmatter as founderFm } from './tampa-founder-meetups.mdx';
import TampaEntrepreneurshipEvents, { frontmatter as entrepreneurFm } from './tampa-entrepreneurship-events.mdx';
import TampaStartupEcosystem, { frontmatter as ecosystemFm } from './tampa-startup-ecosystem.mdx';
import Builders, { frontmatter as buildersFm } from './builders.mdx';

export interface FAQEntry {
  q: string;
  a: string;
}

export interface PageEntry {
  slug: string;
  title: string;
  description: string;
  h1: string;
  order: number;
  faqs: FAQEntry[];
  /** Optional tag to pre-filter /groups links (e.g. "AI/ML", "Startup") */
  groupsTag: string | null;
  /** Optional calendar filter params (e.g. "type=in-person") */
  calendarFilter: string | null;
  component: ComponentType;
}

function entry(slug: string, component: ComponentType, fm: Record<string, unknown>): PageEntry {
  return {
    slug,
    title: (fm.title as string) || slug,
    description: (fm.description as string) || '',
    h1: (fm.h1 as string) || (fm.title as string) || slug,
    order: (fm.order as number) || 99,
    faqs: (fm.faqs as FAQEntry[]) || [],
    groupsTag: (fm.groupsTag as string) || null,
    calendarFilter: (fm.calendarFilter as string) || null,
    component,
  };
}

export const PAGES: PageEntry[] = [
  entry('tampa-bay-tech-events', TampaBayTechEvents, tampaBayFm),
  entry('tampa-developer-meetups', TampaDeveloperMeetups, devMeetupsFm),
  entry('st-petersburg-tech-events', StPetersburgTechEvents, stPeteFm),
  entry('clearwater-tech-events', ClearwaterTechEvents, clearwaterFm),
  entry('tampa-ai-meetups', TampaAiMeetups, aiFm),
  entry('tampa-startup-events', TampaStartupEvents, startupFm),
  entry('tampa-founder-meetups', TampaFounderMeetups, founderFm),
  entry('tampa-entrepreneurship-events', TampaEntrepreneurshipEvents, entrepreneurFm),
  entry('tampa-startup-ecosystem', TampaStartupEcosystem, ecosystemFm),
  entry('builders', Builders, buildersFm),
].sort((a, b) => a.order - b.order);

export const PAGES_BY_SLUG = Object.fromEntries(PAGES.map((p) => [p.slug, p]));

/** All page slugs, for use in routes.ts and sitemap */
export const PAGE_SLUGS = PAGES.map((p) => p.slug);
