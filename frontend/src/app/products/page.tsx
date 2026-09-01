"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Package, Search, History, Eye, Building2, CheckCircle2, AlertOctagon } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function ProductsListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`, {
      headers: { authorization: "Bearer dev-inspector" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.products) {
          setProducts(data.data.products);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Loading product records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Commodity Products Registry" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Commodity Products & Longitudinal History
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Longitudinal tracking of registered commodities and multi-inspection compliance records (Module 16).
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by commodity name, brand, or category..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800 shadow-2xs"
            />
          </div>

          {/* Products Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Commodity & Brand</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Manufacturer</th>
                    <th className="px-6 py-3 text-center">Inspections</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500">{p.brand || "Unbranded"}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {p.manufacturerName || "Declared on Packaging"}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                            {p.totalInspections || 1} Scans
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link href={`/products/${p.id}`}>
                            <Button variant="secondary" size="sm" icon={<History className="w-3.5 h-3.5" />}>
                              View Timeline
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No commodity products recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
