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
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  };

  const variantStyles = {
    primary: "bg-[#12304A] hover:bg-[#1A4266] text-white focus:ring-[#12304A] shadow-sm",
    blue: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white focus:ring-[#2563EB] shadow-sm",
    secondary: "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 focus:ring-slate-300 shadow-xs",
    danger: "bg-[#DC2626] hover:bg-[#B91C1C] text-white focus:ring-[#DC2626] shadow-sm",
    outline: "bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-slate-400",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-300",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
