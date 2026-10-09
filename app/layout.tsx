import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fireflies Clone",
  description: "Meeting notes and transcription workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
