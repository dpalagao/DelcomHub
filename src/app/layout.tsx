import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delcom Project Hub",
  description: "Purchase Request, Approval & Disbursement System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
