"use client";

import { useParams } from "next/navigation";
import { SettingsWorkspace, type TenantSettingsSectionId } from "../page";

export default function TenantSettingsSectionPage() {
  const params = useParams<{ section?: string }>();
  const section = (params?.section || "profile") as TenantSettingsSectionId;
  return <SettingsWorkspace section={section} />;
}
