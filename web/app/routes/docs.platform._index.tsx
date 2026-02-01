/**
 * Platform Docs Index - redirects to the first doc page
 */

import { redirect } from "react-router";
import { PLATFORM_DOCS } from "~/content/platform-docs";

export function loader() {
  const first = PLATFORM_DOCS[0];
  if (first) {
    throw redirect(`/docs/platform/${first.slug}`);
  }
  throw redirect("/docs");
}

export default function PlatformDocsIndex() {
  return null;
}
