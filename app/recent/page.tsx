import type { Metadata } from "next"
import { RecentPageClient } from "@/components/pages/recent-page-client"

export const metadata: Metadata = {
  title: "Recently Updated",
  description: "Discover the latest Magisk and KernelSU modules with recent updates, new features, and bug fixes.",
  keywords: ["recent magisk modules", "updated modules", "latest modules", "new magisk modules"],
  openGraph: {
    title: "Recently Updated Modules | modules",
    description: "Discover the latest Magisk and KernelSU modules with recent updates, new features, and bug fixes.",
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Recently Updated Modules | modules",
    description: "Discover the latest Magisk and KernelSU modules with recent updates.",
    images: ['/og-image.png'],
  },
}

export default function RecentPage() {
  return <RecentPageClient />
}