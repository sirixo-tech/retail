"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnlineStoreWorkspace, type OnlineStoreSectionId } from "../page";

const VALID_SECTIONS = new Set<OnlineStoreSectionId>([
  "settings",
  "loyalty",
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
  const router = useRouter();

  useEffect(() => {
    if (section === "payments") {
      router.replace("/settings/gateways");
    }
  }, [section, router]);

  if (section === "payments") {
    return null;
  }

  const resolvedSection: OnlineStoreSectionId = VALID_SECTIONS.has(section as OnlineStoreSectionId)
    ? (section as OnlineStoreSectionId)
    : "settings";

  return <OnlineStoreWorkspace initialSection={resolvedSection} />;
}
