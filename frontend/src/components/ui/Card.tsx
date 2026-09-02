import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${className}`}
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
    <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}>
      {title || description ? (
        <div>
          {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      ) : (
        children
      )}
      {action && <div>{action}</div>}
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
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
