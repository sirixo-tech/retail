import type { ReactNode } from "react";
import { AdminShell } from "./shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
