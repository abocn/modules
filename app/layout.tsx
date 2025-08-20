import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider"
import { WebsiteStructuredData } from "@/components/shared/structured-data"
import { Toaster } from "@/components/ui/sonner"
import { SWRProvider } from "@/lib/swr-config"
import { AuthProvider } from "@/lib/auth-context"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "modules | A Magisk Modules Repository",
    template: "%s | modules"
  },
  description: "Discover, download, and publish Magisk and KernelSU modules on the top platform for Android rooting. Experience true Android freedom!",
  keywords: ["magisk modules", "kernelsu modules", "root modules", "android customization", "xposed modules"],
  authors: [{ name: "modules.lol" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "modules | A Magisk Modules Repository",
    description: "Discover, download, and publish Magisk and KernelSU modules on the top platform for Android rooting. Experience true Android freedom!",
    url: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
    siteName: 'modules',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'modules - Magisk & KernelSU Modules Repository',
      }
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  twitter: {
    card: 'summary_large_image',
    title: "modules | A Magisk Modules Repository",
    description: "Discover, download, and publish Magisk and KernelSU modules on the top platform for Android rooting. Experience true Android freedom!",
    images: ['/og-image.png'],
    creator: '@modules_lol',
    site: '@modules_lol',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geistSans.className}>
        <WebsiteStructuredData />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <SWRProvider>
              {children}
            </SWRProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
