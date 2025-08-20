import { Metadata } from "next"
import FeaturedClient from "./featured-client"

export const metadata: Metadata = {
  title: "Featured Modules",
  description: "Browse our selection of featured Magisk and KernelSU modules, handpicked for quality and functionality.",
  keywords: ["featured magisk modules", "popular magisk modules", "best magisk modules"],
  openGraph: {
    title: "Featured Modules | modules",
    description: "Browse our selection of featured Magisk and KernelSU modules, handpicked for quality and functionality.",
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Featured Modules | modules",
    description: "Browse our selection of featured Magisk and KernelSU modules.",
    images: ['/og-image.png'],
  },
}

export default function FeaturedPage() {
  return <FeaturedClient />
}