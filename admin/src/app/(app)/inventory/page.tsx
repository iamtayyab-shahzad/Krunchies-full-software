"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  mockInventory,
  mockRecipes,
  mockStockHistory,
} from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function InventoryPage() {
  const [tab, setTab] = useState<"items" | "recipes" | "history">("items");

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, suppliers, recipes, and history"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["items", "Inventory Items"],
            ["recipes", "Recipes"],
            ["history", "Stock History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === key
                ? "bg-orange-500 text-black"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "items" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3">Purchase Price</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Minimum Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockInventory.map((item) => {
                const low = item.currentStock <= item.minimumStock;
                return (
                  <tr key={item.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 font-bold">{item.name}</td>
                    <td className="px-4 py-3">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-orange-400">
                      {formatPrice(item.purchasePrice)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{item.supplier}</td>
                    <td className="px-4 py-3">
                      {item.minimumStock} {item.unit}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={low ? "warning" : "success"}>
                        {low ? "Low stock" : "OK"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "recipes" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {mockRecipes.map((recipe) => (
            <Card key={recipe.id}>
              <h3 className="text-lg font-black">{recipe.productName}</h3>
              <ul className="mt-3 space-y-2">
                {recipe.ingredients.map((ing) => (
                  <li
                    key={ing.itemName}
                    className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                  >
                    <span>{ing.itemName}</span>
                    <span className="font-bold text-orange-400">
                      {ing.quantity} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-3">
          {mockStockHistory.map((row) => (
            <Card key={row.id} className="!p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{row.itemName}</p>
                  <p className="text-sm text-zinc-400">{row.reason}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-black ${
                      row.change >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.change > 0 ? `+${row.change}` : row.change}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
