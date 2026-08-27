import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/providers/sw-register";

// This is a fully dynamic, multi-tenant, DB-backed SaaS - no page has a
// meaningful static version. Forcing dynamic rendering here (cascades to
// every page) stops Next.js from prerendering pages at build time, which
// would otherwise query the database (and fail the build) before any
// runtime environment variables are available. All DB access happens at
// request time in the deployed serverless function instead.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FabriGroup Rent Manager",
    template: "%s | FabriGroup Rent Manager",
  },
  description:
    "FabriGroup Rent Manager - gestionale SaaS per autonoleggio, flotte, officina, contratti, pagamenti e fatturazione.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FabriGroup",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1420",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-center" />
            <ServiceWorkerRegister />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
