import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "מחירון משקי דן - הדברה ודשן",
  description: "מחירון חומרי הדברה ודשן של משקי דן",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "מחירון משקי דן",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f7a3d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-brand-bg text-brand-ink">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
