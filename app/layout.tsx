import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LakeScope - Environmental Analysis Platform",
  description: "Advanced lake and watershed analysis platform for environmental monitoring, land use planning, and economic impact assessment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
