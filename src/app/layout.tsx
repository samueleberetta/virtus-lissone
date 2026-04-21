import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestionale Virtus Lissone",
  description:
    "Gestionale per la Polisportiva Virtus Lissone — società sportiva dilettantistica affiliata CSI, fondata nel 1903.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
