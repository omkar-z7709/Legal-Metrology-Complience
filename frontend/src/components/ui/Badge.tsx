import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

export type StatusType = "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW" | "INFO" | "NEUTRAL";

interface BadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  label,
  size = "md",
  showIcon = true,
}: BadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "COMPLIANT":
        return {
          text: label || "COMPLIANT",
          className: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "NON_COMPLIANT":
        return {
          text: label || "NON-COMPLIANT",
          className: "bg-red-50 text-red-800 border-red-200",
          icon: <XCircle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "REQUIRES_REVIEW":
        return {
          text: label || "REQUIRES REVIEW",
          className: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <AlertTriangle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "INFO":
        return {
          text: label || "INFORMATION",
          className: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <Info className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "NEUTRAL":
      default:
        return {
          text: label || "PENDING",
          className: "bg-slate-100 text-slate-700 border-slate-200",
          icon: null,
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase ${config.className} ${sizeClasses}`}
    >
      {showIcon && config.icon}
      {config.text}
    </span>
  );
}
