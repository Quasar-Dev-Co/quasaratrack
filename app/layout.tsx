import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/components/redux-provider";
import { Providers } from "@/components/providers";
import { PWAProvider } from "@/components/pwa-provider";

export const metadata: Metadata = {
  title: "Quasara Track — Employee Productivity Dashboard",
  description:
    "Real-time employee productivity tracking with AI summaries and Google Sheets export",
  icons: {
    icon: "/icon-48.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quasara Track",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f24",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <PWAProvider>
          <Providers>
            <ReduxProvider>{children}</ReduxProvider>
          </Providers>
        </PWAProvider>
      </body>
    </html>
  );
}
