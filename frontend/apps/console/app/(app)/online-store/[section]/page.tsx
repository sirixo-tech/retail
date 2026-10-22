"use client";

import { use } from "react";
import { OnlineStoreWorkspace, type OnlineStoreSectionId } from "../page";

const VALID_SECTIONS = new Set<OnlineStoreSectionId>([
  "settings",
  "payments",
  "orders",
  "collections",
  "banners",
  "subscribers",
  "messages",
  "invite-codes",
  "pending-customers",
  "guest-customers",
  "registered-customers",
  "shipping",
  "taxes",
]);

export default function OnlineStoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const resolvedSection: OnlineStoreSectionId = VALID_SECTIONS.has(section as OnlineStoreSectionId)
    ? (section as OnlineStoreSectionId)
    : "settings";

  return <OnlineStoreWorkspace initialSection={resolvedSection} />;
}
