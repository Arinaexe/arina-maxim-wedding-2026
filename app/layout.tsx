import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Арина & Максим — 09.09.2026",
  description: "Приглашение на свадьбу Арины и Максима.",
  openGraph: {
    title: "Арина & Максим — 09.09.2026",
    description: "Приглашение на свадьбу Арины и Максима.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
