import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = "", noPadding, ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  title,
  description,
  action,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`px-5 py-4 border-b border-slate-100 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row bg-white ${className}`}>
      {title || description ? (
        <div className="flex-1">
          {title && <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight">{title}</h3>}
          {description && <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{description}</p>}
        </div>
      ) : (
        children
      )}
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-5 flex-1 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 flex-col sm:flex-row ${className}`}>
      {children}
    </div>
  );
}
