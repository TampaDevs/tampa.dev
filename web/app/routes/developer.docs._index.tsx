/**
 * Developer Docs Index - redirects to the first doc page
 */

import { redirect } from "react-router";
import { DOCS } from "~/content/docs";

export function loader() {
  const first = DOCS[0];
  if (first) {
    throw redirect(`/developer/docs/${first.slug}`);
  }
  throw redirect("/developer");
}

export default function DocsIndex() {
  return null;
}
