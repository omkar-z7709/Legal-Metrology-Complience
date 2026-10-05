import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "blue" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none motion-reduce:transition-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[13px] gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-[15px] gap-2.5",
  };

  const variantStyles = {
    // Primary action (Navy)
    primary:
      "bg-[var(--navy-primary)] hover:bg-[#0a1e2f] text-white focus:ring-[var(--navy-primary)] shadow-sm hover:shadow",
    // Action (Blue)
    blue: "bg-[var(--blue-primary)] hover:bg-[#1d4ed8] text-white focus:ring-[var(--blue-primary)] shadow-sm hover:shadow",
    // Standard secondary
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 focus:ring-slate-300 shadow-sm",
    // Dangerous actions
    danger:
      "bg-[var(--status-noncompliant)] hover:bg-[#b91c1c] text-white focus:ring-[var(--status-noncompliant)] shadow-sm hover:shadow",
    // Explicit outline
    outline:
      "bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300 focus:ring-slate-400",
    // Ghost (no border)
    ghost:
      "bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-300",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
