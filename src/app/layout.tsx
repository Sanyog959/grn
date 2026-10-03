import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURA GRN | Enterprise Goods Received Note SaaS with Supabase Backend",
  description: "Enterprise Goods Received Note (GRN) SaaS with Supabase PostgreSQL cloud database, quality inspection workflows, and supplier management.",
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
