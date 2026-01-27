import { describe, it, expect } from "vitest";
import {
  groups,
  getGroupBySlug,
  getGroupByMeetupUrlname,
  getFeaturedGroups,
  getAllTags,
  getGroupsByTag,
  getMeetupUrlnames,
} from "./groups";

describe("groups data", () => {
  it("has groups defined", () => {
    expect(groups.length).toBeGreaterThan(0);
  });

  it("all groups have required fields", () => {
    for (const group of groups) {
      expect(group.slug).toBeTruthy();
      expect(group.name).toBeTruthy();
      expect(group.description).toBeTruthy();
      expect(group.website).toBeTruthy();
      expect(group.logo).toBeTruthy();
      expect(Array.isArray(group.tags)).toBe(true);
    }
  });
});

describe("getGroupBySlug", () => {
  it("finds a group by slug", () => {
    const group = getGroupBySlug("tampa-devs");
    expect(group).toBeDefined();
    expect(group?.name).toBe("Tampa Devs");
  });

  it("returns undefined for non-existent slug", () => {
    const group = getGroupBySlug("non-existent-group");
    expect(group).toBeUndefined();
  });
});

describe("getGroupByMeetupUrlname", () => {
  it("finds a group by Meetup urlname", () => {
    const group = getGroupByMeetupUrlname("tampadevs");
    expect(group).toBeDefined();
    expect(group?.slug).toBe("tampa-devs");
  });

  it("is case insensitive", () => {
    const group = getGroupByMeetupUrlname("TAMPADEVS");
    expect(group).toBeDefined();
  });

  it("returns undefined for non-existent urlname", () => {
    const group = getGroupByMeetupUrlname("non-existent");
    expect(group).toBeUndefined();
  });
});

describe("getFeaturedGroups", () => {
  it("returns only featured groups", () => {
    const featured = getFeaturedGroups();
    expect(featured.length).toBeGreaterThan(0);
    for (const group of featured) {
      expect(group.featured).toBe(true);
    }
  });
});

describe("getAllTags", () => {
  it("returns unique sorted tags", () => {
    const tags = getAllTags();
    expect(tags.length).toBeGreaterThan(0);

    // Check sorted
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);

    // Check unique
    const unique = [...new Set(tags)];
    expect(tags).toEqual(unique);
  });
});

describe("getGroupsByTag", () => {
  it("returns groups with the specified tag", () => {
    const awsGroups = getGroupsByTag("aws");
    expect(awsGroups.length).toBeGreaterThan(0);
    for (const group of awsGroups) {
      expect(group.tags).toContain("aws");
    }
  });

  it("returns empty array for non-existent tag", () => {
    const groups = getGroupsByTag("non-existent-tag");
    expect(groups).toEqual([]);
  });
});

describe("getMeetupUrlnames", () => {
  it("returns urlnames for groups with meetup integration", () => {
    const urlnames = getMeetupUrlnames();
    expect(urlnames.length).toBeGreaterThan(0);
    for (const urlname of urlnames) {
      expect(typeof urlname).toBe("string");
      expect(urlname.length).toBeGreaterThan(0);
    }
  });
});
