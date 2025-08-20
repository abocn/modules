import type { Metadata } from "next"
import { HomePageClient } from "@/components/pages/home-page-client"

export const metadata: Metadata = {
  title: "Home | modules",
  description: "Discover the best Magisk and KernelSU modules for your Android device. Browse featured, recommended, and latest modules from the community.",
  openGraph: {
    title: "modules | Discover the Best Android Root Modules",
    description: "Browse featured, recommended, and latest Magisk & KernelSU modules. Safe, verified root modules for Android customization.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'modules - Discover the Best Android Root Modules',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "modules | Discover the Best Android Root Modules",
    description: "Browse featured, recommended, and latest Magisk & KernelSU modules.",
    images: ['/og-image.png'],
  },
}

export default function Home() {
  return <HomePageClient />
}
