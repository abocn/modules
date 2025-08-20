import type { Metadata } from "next"
import { RecommendedPageClient } from "@/components/pages/recommended-page-client"

export const metadata: Metadata = {
  title: "Recommended Modules",
  description: "Explore our recommended Magisk and KernelSU modules.",
  keywords: ["recommended magisk modules", "trusted modules", "safe magisk modules", "safe rooting", "safe kernelsu modules"],
  openGraph: {
    title: "Recommended Modules | modules",
    description: "Explore our recommended Magisk and KernelSU modules.",
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Recommended Modules | modules",
    description: "Explore our recommended Magisk and KernelSU modules.",
    images: ['/og-image.png'],
  },
}

export default function RecommendedPage() {
  return <RecommendedPageClient />
}