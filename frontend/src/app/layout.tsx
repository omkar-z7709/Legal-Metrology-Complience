import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Legal Metrology Compliance System | SIH Prototype",
  description: "AI + RAG Based Legal Metrology (Packaged Commodities) Compliance System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
