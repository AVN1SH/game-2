import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Dead Zone — FPS Zombie Survival",
  description:
    "Survive endless waves of the undead in this browser-based FPS zombie shooter. Powered by React Three Fiber.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
