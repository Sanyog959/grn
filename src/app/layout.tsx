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
      <body>
        <div className="aurora-bg-ambient">
          <div className="aurora-glow-1"></div>
          <div className="aurora-glow-2"></div>
          <div className="aurora-glow-3"></div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
