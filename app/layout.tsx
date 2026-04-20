import type { Metadata } from "next";
import { OfflineSync } from "@/components/offline-sync";
import { PwaRegister } from "@/components/pwa-register";
import { appConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Voca Fun",
  description: "A themed SAT vocabulary web app for daily learning and review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <PwaRegister />
        <OfflineSync householdCode={appConfig.householdCode} learnerId={appConfig.learnerId} />
        {children}
      </body>
    </html>
  );
}
