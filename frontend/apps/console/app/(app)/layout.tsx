import type { ReactNode } from "react";
import { PasswordGate } from "../password-gate";
import { ConsoleShell } from "./shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PasswordGate>
      <ConsoleShell>{children}</ConsoleShell>
    </PasswordGate>
  );
}
