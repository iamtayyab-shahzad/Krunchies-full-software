"use client";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

/** Expenses UI moved to shop POS — keep route so old bookmarks do not 404. */
export default function ExpensesMovedPage() {
  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Expense entry moved to the shop POS"
      />
      <Card>
        <p className="text-zinc-300">
          Log and edit expenses on the <strong className="text-white">shop POS → Expenses</strong>{" "}
          screen. Admin Profit &amp; Loss still uses those same expense records.
        </p>
      </Card>
    </div>
  );
}
