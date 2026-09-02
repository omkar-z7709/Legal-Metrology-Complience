"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Download, FileText, Eye, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function ReportsPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scans`, {
      headers: { authorization: "Bearer dev-inspector" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.scans) {
          setScans(data.data.scans);
        }
      })
      .catch((err) => console.error("[FRONTEND] Error loading reports:", err))
      .finally(() => setLoading(false));
  }, []);

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

  const filteredScans = scans.filter((s) => {
    const reportNum = `RPT-${s.scanNumber}`;
    const prodName = s.analysis?.declarations?.generic_name?.value || s.productName || "Commodity";
    return (
      reportNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prodName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Loading statutory report registry...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar breadcrumbs={[{ label: "Statutory Reports" }]} />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-[#12304A] tracking-tight">
                Generated Statutory Inspection Reports
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Official PDF and editable DOCX compliance reports generated under Legal Metrology Rules, 2011.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Report Number or Product..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12304A] bg-white text-slate-800"
              />
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Report Number</th>
                    <th className="px-6 py-3.5">Commodity Sample</th>
                    <th className="px-6 py-3.5">Inspection Date</th>
                    <th className="px-6 py-3.5">Compliance Status</th>
                    <th className="px-6 py-3.5 text-right">Download Formats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredScans.length > 0 ? (
                    filteredScans.map((s) => {
                      const reportNumber = `RPT-${s.scanNumber}`;
                      const productName =
                        s.analysis?.declarations?.generic_name?.value ||
                        s.productName ||
                        "Packaged Commodity Sample";

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                            {reportNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{productName}</div>
                            <div className="text-[11px] text-slate-400">Scan: {s.scanNumber}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(s.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={s.complianceStatus || "REQUIRES_REVIEW"} size="sm" />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/inspections/${s.id}`}>
                                <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>
                                  View
                                </Button>
                              </Link>

                              <Button
                                variant="primary"
                                size="sm"
                                loading={downloadingId === `pdf-${s.id}`}
                                onClick={() => handleDownloadPdf(s.id, s.scanNumber)}
                                icon={<Download className="w-3.5 h-3.5" />}
                              >
                                PDF
                              </Button>

                              <Button
                                variant="secondary"
                                size="sm"
                                loading={downloadingId === `docx-${s.id}`}
                                onClick={() => handleDownloadDocx(s.id, s.scanNumber)}
                                icon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
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
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No statutory report records matching query.
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
