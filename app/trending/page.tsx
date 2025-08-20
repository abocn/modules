import type { Metadata } from "next"
import { TrendingPageClient } from "@/components/pages/trending-page-client"

export const metadata: Metadata = {
  title: "Trending Modules | modules",
  description: "Discover most popular Magisk and KernelSU modules based on modules platform data.",
  openGraph: {
    title: "Trending Modules | modules",
    description: "Discover most popular Magisk and KernelSU modules based on modules platform data.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Trending Android Root Modules',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Trending Modules | modules",
    description: "Discover trending Magisk & KernelSU modules.",
    images: ['/og-image.png'],
  },
}

export default function TrendingPage() {
  return <TrendingPageClient />
}