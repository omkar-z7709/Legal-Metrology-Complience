"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Package, Search, Eye, History } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useDebounce } from "@/lib/useDebounce";
import { useCachedApi } from "@/lib/cache";

export default function ProductsListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: productsData, loading } = useCachedApi(
    `${API_BASE_URL}/api/products`,
    { headers: { authorization: "Bearer dev-inspector" } },
    60000
  );

  const products = productsData?.data?.products || [];

  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return products;
    return products.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term),
    );
  }, [products, debouncedSearch]);

  // The shell (sidebar, title, filters) renders immediately; only the record
  // region waits on the API. Gating the whole page made navigation appear to
  // block on GET /api/products.
  const LoadingRows = () => (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-3.5">
            <div className="h-3 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-24 rounded bg-slate-100" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-5 w-24 rounded bg-slate-200" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-3 w-32 rounded bg-slate-100" />
          </td>
          <td className="px-5 py-3.5 text-center">
            <div className="mx-auto h-5 w-20 rounded bg-slate-200" />
          </td>
          <td className="px-5 py-3.5 text-right">
            <div className="ml-auto h-7 w-16 rounded bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Commodity Products Registry" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Registry</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Commodities
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Longitudinal compliance records.
              </p>
            </div>
          </header>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, brand, or category..."
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
            />
          </div>

          <div className="flex flex-col space-y-4">
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 text-xs font-medium text-slate-500 transition-opacity ${
                loading ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Loading product records...
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">Commodity & Brand</th>
                      <th scope="col" className="px-5 py-3">Category</th>
                      <th scope="col" className="px-5 py-3">Manufacturer</th>
                      <th scope="col" className="px-5 py-3 text-center">Inspections</th>
                      <th scope="col" className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <LoadingRows />
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">{p.name || "Unnamed"}</div>
                            <div className="text-xs text-slate-500">{p.brand || "Unbranded"}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {p.category || "Uncategorized"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {p.manufacturerName || "Declared on Packaging"}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                              {p.totalInspections || 1} Scans
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link href={`/products/${p.id}`}>
                              <Button variant="secondary" size="sm" icon={<History className="h-3.5 w-3.5" aria-hidden="true" />}>
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                          No commodity products recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {loading ? (
                <Card>
                  <CardBody className="flex items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
                    <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Loading product records...
                  </CardBody>
                </Card>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p: any) => (
                  <Card key={p.id}>
                    <CardBody className="flex flex-col gap-3 p-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{p.name || "Unnamed"}</h3>
                        <p className="text-sm text-slate-500">{p.brand || "Unbranded"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {p.category || "Uncategorized"}
                        </span>
                        <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                          {p.totalInspections || 1} Scans
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Mfr:</span> {p.manufacturerName || "Declared on Packaging"}
                      </p>
                      <Link href={`/products/${p.id}`} className="mt-2 block">
                        <Button variant="secondary" className="w-full justify-center" icon={<History className="h-4 w-4" aria-hidden="true" />}>
                          View Timeline
                        </Button>
                      </Link>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardBody className="p-6 text-center text-sm text-slate-500">
                     No commodity products recorded yet.
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
