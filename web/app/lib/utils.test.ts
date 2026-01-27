import { describe, it, expect } from "vitest";
import {
  truncate,
  stripHtml,
  slugify,
  addUtmParams,
  getRsvpLabel,
  getSourceDisplayName,
  groupEventsByDate,
} from "./utils";

describe("truncate", () => {
  it("returns text unchanged if shorter than max length", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates text and adds ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("trims whitespace before adding ellipsis", () => {
    expect(truncate("hello world", 6)).toBe("hello...");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world"
    );
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("Hello world")).toBe("Hello world");
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("tampa devs")).toBe("tampa-devs");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World?")).toBe("hello-world");
  });

  it("removes leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });
});

describe("addUtmParams", () => {
  it("adds default UTM parameters", () => {
    const result = addUtmParams("https://example.com/event");
    expect(result).toContain("utm_source=tampa_dev");
    expect(result).toContain("utm_medium=web");
    expect(result).toContain("utm_campaign=events");
  });

  it("allows custom UTM parameters", () => {
    const result = addUtmParams(
      "https://example.com/event",
      "custom_source",
      "email",
      "newsletter"
    );
    expect(result).toContain("utm_source=custom_source");
    expect(result).toContain("utm_medium=email");
    expect(result).toContain("utm_campaign=newsletter");
  });

  it("preserves existing query parameters", () => {
    const result = addUtmParams("https://example.com/event?id=123");
    expect(result).toContain("id=123");
    expect(result).toContain("utm_source=tampa_dev");
  });
});

describe("getRsvpLabel", () => {
  it("returns Meetup label by default", () => {
    expect(getRsvpLabel()).toBe("RSVP on Meetup");
    expect(getRsvpLabel("meetup")).toBe("RSVP on Meetup");
  });

  it("returns Eventbrite label", () => {
    expect(getRsvpLabel("eventbrite")).toBe("RSVP on Eventbrite");
  });

  it("returns Luma label", () => {
    expect(getRsvpLabel("luma")).toBe("RSVP on Luma");
  });
});

describe("getSourceDisplayName", () => {
  it("returns Meetup by default", () => {
    expect(getSourceDisplayName()).toBe("Meetup");
    expect(getSourceDisplayName("meetup")).toBe("Meetup");
  });

  it("returns Eventbrite", () => {
    expect(getSourceDisplayName("eventbrite")).toBe("Eventbrite");
  });

  it("returns Luma", () => {
    expect(getSourceDisplayName("luma")).toBe("Luma");
  });
});

describe("groupEventsByDate", () => {
  it("groups events by date", () => {
    const events = [
      { id: "1", dateTime: "2025-01-15T10:00:00Z" },
      { id: "2", dateTime: "2025-01-15T14:00:00Z" },
      { id: "3", dateTime: "2025-01-16T10:00:00Z" },
    ];

    const grouped = groupEventsByDate(events);

    expect(grouped.size).toBe(2);
  });

  it("returns empty map for empty array", () => {
    const grouped = groupEventsByDate([]);
    expect(grouped.size).toBe(0);
  });
});
