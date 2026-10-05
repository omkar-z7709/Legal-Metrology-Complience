import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, ShieldAlert } from "lucide-react";

export type StatusType = "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW" | "INFO" | "NEUTRAL" | "ACTION_REQUIRED";

interface BadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = "md",
  showIcon = true,
  className = "",
}: BadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "COMPLIANT":
        return {
          text: label || "COMPLIANT",
          className: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant)] border-[var(--status-compliant-border)]",
          icon: <CheckCircle2 className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "NON_COMPLIANT":
        return {
          text: label || "NON-COMPLIANT",
          className: "bg-[var(--status-noncompliant-bg)] text-[var(--status-noncompliant)] border-[var(--status-noncompliant-border)]",
          icon: <XCircle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "REQUIRES_REVIEW":
        return {
          text: label || "REQUIRES REVIEW",
          className: "bg-[var(--status-review-bg)] text-[var(--status-review)] border-[var(--status-review-border)]",
          icon: <AlertTriangle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "ACTION_REQUIRED":
        return {
          text: label || "ACTION REQUIRED",
          className: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <ShieldAlert className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />,
        };
      case "INFO":
        return {
          text: label || "INFORMATION",
          className: "bg-blue-50 text-blue-700 border-blue-200",
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
  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-[10px] font-bold"
    : "px-2.5 py-1 text-[11px] font-bold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border tracking-wide uppercase shadow-sm ${config.className} ${sizeClasses} ${className}`}
    >
      {showIcon && config.icon}
      {config.text}
    </span>
  );
}
