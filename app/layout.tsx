import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sorter.ly",
  description: "local-run customizable collections",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}