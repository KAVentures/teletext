import type { Metadata, Viewport } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

const teletextFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-teletext"
});

export const metadata: Metadata = {
  title: "Teletext — what matters now",
  description: "A live Teletext-style news service driven by what is trending on X."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={teletextFont.variable}>
      <body>{children}</body>
    </html>
  );
}
