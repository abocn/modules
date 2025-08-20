import type { Metadata } from "next"
import { SubmitPageClient } from "@/components/pages/submit-page-client"

export const metadata: Metadata = {
  title: "Submit Module",
  description: "Submit your Magisk or KernelSU module to our repository.",
  keywords: ["submit magisk module", "magisk module repo", "kernelsu module repo"],
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Submit Module | modules",
    description: "Submit your Magisk or KernelSU module to our repository.",
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Submit Module | modules",
    description: "Submit your Magisk or KernelSU module to our repository.",
    images: ['/og-image.png'],
  },
}

export default function SubmitPage() {
  return <SubmitPageClient />
}