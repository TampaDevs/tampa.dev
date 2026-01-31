/**
 * Admin Docs Index - redirects to the first admin doc page
 */

import { redirect } from "react-router";
import { ADMIN_DOCS } from "~/content/admin-docs";

export function loader() {
  const first = ADMIN_DOCS[0];
  if (first) {
    throw redirect(`/admin/docs/${first.slug}`);
  }
  throw redirect("/admin");
}

export default function AdminDocsIndex() {
  return null;
}
