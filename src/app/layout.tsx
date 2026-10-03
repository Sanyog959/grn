import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SANYOG ENG | Material Inventory & GRN System",
  description: "SANYOG ENG - Enterprise Goods Received Note (GRN) and Material Inventory Management System with quality inspection workflows and supplier management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>{children}</div>
      </body>
    </html>
  );
}
