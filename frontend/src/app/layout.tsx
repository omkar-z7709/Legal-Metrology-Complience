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
      <body suppressHydrationWarning className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
