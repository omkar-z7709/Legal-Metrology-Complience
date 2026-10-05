"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Download, FileText, Eye, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useDebounce } from "@/lib/useDebounce";
import { useCachedApi } from "@/lib/cache";

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: scansData, loading } = useCachedApi(
    `${API_BASE_URL}/api/scans`,
    { headers: { authorization: "Bearer dev-inspector" } },
    60000
  );

  const scans = scansData?.data?.scans || [];

  const handleDownloadPdf = async (scanId: string, scanNumber: string) => {
    setDownloadingId(`pdf-${scanId}`);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/inspections/${scanId}/report?download=true`,
        {
          method: "GET",
          headers: { authorization: "Bearer dev-inspector" },
        }
      );

      if (!response.ok) {
        throw new Error(`Report generation failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Inspection_Report_${scanNumber || scanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      alert(`Failed to download PDF report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadDocx = async (scanId: string, scanNumber: string) => {
    setDownloadingId(`docx-${scanId}`);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/inspections/${scanId}/report/docx`,
        {
          method: "GET",
          headers: { authorization: "Bearer dev-inspector" },
        }
      );

      if (!response.ok) {
        throw new Error(`DOCX report generation failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Inspection_Report_${scanNumber || scanId}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      alert(`Failed to download DOCX report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredScans = React.useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return scans;
    return scans.filter((s: any) => {
      const reportNum = `RPT-${s.scanNumber}`;
      const prodName = s.analysis?.declarations?.generic_name?.value || s.productName || "Commodity";
      return (
        reportNum.toLowerCase().includes(term) ||
        s.scanNumber?.toLowerCase().includes(term) ||
        prodName.toLowerCase().includes(term)
      );
    });
  }, [scans, debouncedSearch]);

  // The shell (sidebar, title, search) renders immediately; only the report
  // registry waits on GET /api/scans. Gating the whole page made navigation
  // appear to block on a fetch navigation does not need.
  const LoadingRows = () => (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-3.5">
            <div className="h-3 w-32 rounded bg-slate-200" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-3 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-24 rounded bg-slate-100" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-3 w-32 rounded bg-slate-100" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-5 w-24 rounded bg-slate-200" />
          </td>
          <td className="px-5 py-3.5 text-right">
            <div className="ml-auto h-7 w-40 rounded bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumbs={[{ label: "Statutory Reports" }]} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">MySS / Registry</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#12304A] sm:text-[30px]">
                Statutory Reports
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Official PDF and editable DOCX compliance reports generated under Legal Metrology Rules, 2011.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Report Number or Product..."
                className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#12304A]"
              />
            </div>
          </header>

          <div className="flex flex-col space-y-4">
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 text-xs font-medium text-slate-500 transition-opacity ${
                loading ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Loading statutory report registry...
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">Report Number</th>
                      <th scope="col" className="px-5 py-3">Commodity Sample</th>
                      <th scope="col" className="px-5 py-3">Inspection Date</th>
                      <th scope="col" className="px-5 py-3">Compliance Status</th>
                      <th scope="col" className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <LoadingRows />
                    ) : filteredScans.length > 0 ? (
                      filteredScans.map((s: any) => {
                        const reportNumber = `RPT-${s.scanNumber}`;
                        const productName =
                          s.analysis?.declarations?.generic_name?.value ||
                          s.productName ||
                          "Packaged Commodity Sample";

                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                              {reportNumber}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-medium text-slate-900">{productName}</div>
                              <div className="text-xs text-slate-500">Scan: {s.scanNumber}</div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">
                              {new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={s.complianceStatus || "REQUIRES_REVIEW"} size="sm" />
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link href={`/inspections/${s.id}`}>
                                  <Button variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}>
                                    View
                                  </Button>
                                </Link>

                                <Button
                                  variant="primary"
                                  size="sm"
                                  loading={downloadingId === `pdf-${s.id}`}
                                  onClick={() => handleDownloadPdf(s.id, s.scanNumber)}
                                  icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                                >
                                  PDF
                                </Button>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  loading={downloadingId === `docx-${s.id}`}
                                  onClick={() => handleDownloadDocx(s.id, s.scanNumber)}
                                  icon={<FileText className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />}
                                >
                                  DOCX
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                          No statutory report records matching query.
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
                    Loading statutory report registry...
                  </CardBody>
                </Card>
              ) : filteredScans.length > 0 ? (
                filteredScans.map((s: any) => {
                  const reportNumber = `RPT-${s.scanNumber}`;
                  const productName =
                    s.analysis?.declarations?.generic_name?.value ||
                    s.productName ||
                    "Packaged Commodity Sample";

                  return (
                    <Card key={s.id}>
                      <div className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono font-semibold text-slate-900">{reportNumber}</span>
                          <StatusBadge status={s.complianceStatus || "REQUIRES_REVIEW"} size="sm" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{productName}</div>
                          <div className="text-xs text-slate-500">Scan: {s.scanNumber}</div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <Link href={`/inspections/${s.id}`} className="block">
                            <Button variant="secondary" className="w-full justify-center" size="sm" icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}>
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center"
                            loading={downloadingId === `pdf-${s.id}`}
                            onClick={() => handleDownloadPdf(s.id, s.scanNumber)}
                            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full justify-center"
                            loading={downloadingId === `docx-${s.id}`}
                            onClick={() => handleDownloadDocx(s.id, s.scanNumber)}
                            icon={<FileText className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />}
                          >
                            DOCX
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <div className="p-6 text-center text-sm text-slate-500">
                    No statutory report records matching query.
                  </div>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
