import type { Metadata } from "next"
import { SearchPageClient } from "@/components/pages/search-page-client"

export const metadata: Metadata = {
  title: "Search Modules",
  description: "Search and filter through tons of Magisk and KernelSU modules. Find exactly what you need with advanced search options.",
  keywords: ["search magisk modules", "find magisk modules", "best magisk modules", "kernelsu modules", "magisk module search"],
  openGraph: {
    title: "Search Modules | modules",
    description: "Search and filter through tons of Magisk and KernelSU modules. Find exactly what you need with advanced search options.",
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Search Modules | modules",
    description: "Search and filter through tons of Magisk and KernelSU modules.",
    images: ['/og-image.png'],
  },
}

export default function SearchPage() {
  return <SearchPageClient />
}