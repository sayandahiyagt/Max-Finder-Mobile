import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MaxFinder | Find lost pets in your area",
  description:
    "A community map for finding lost pets and sharing anonymous sightings.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const fontClasses = `${geistSans.variable} ${geistMono.variable}`;

  return (
    <html lang="en" className={fontClasses}>
      <body>{children}</body>
    </html>
  );
}
