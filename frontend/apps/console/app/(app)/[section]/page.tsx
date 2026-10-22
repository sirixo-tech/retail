import { PageHeader } from "@selfx/ui";
import BranchesPage from "../branches/page";
import PosTerminalsPage from "../pos-terminals/page";
import QrBuilderPage from "../qr-builder/page";

const copy: Record<string, string> = {
  orders: "Online and counter orders. Status changes will move in realtime once the order service is connected.",
  products: "Store items, prices, and barcodes. Adding from the global catalog is the next inventory milestone.",
  inventory: "Stock ledger, batches, and purchase orders.",
  customers: "Profiles, khata, and loyalty.",
  reports: "Sales, GST, and stock valuation.",
  billing: "The current plan is Enterprise. Invoices and upgrades are billed to this tenant.",
  settings: "Printers, tax, receipt layout, and payment gateways.",
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "branches") return <BranchesPage />;
  if (section === "pos-terminals") return <PosTerminalsPage />;
  if (section === "qr-builder") return <QrBuilderPage />;

  const title = section.slice(0, 1).toUpperCase() + section.slice(1);
  return <PageHeader title={title} description={copy[section] ?? "This section is not part of the console."} />;
}
