import type { Metadata } from "next"
import { MySubmissionsPageClient } from "@/components/pages/my-submissions-page-client"

export const metadata: Metadata = {
  title: "My Submissions",
  description: "Manage and track your submitted Magisk and KernelSU modules.",
  keywords: ["root modules", "publish magisk module", "magisk repository"],
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "My Submissions | modules",
    description: "Manage and track your submitted Magisk and KernelSU modules.",
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "My Submissions | modules",
    description: "Manage and track your submitted modules.",
    images: ['/og-image.png'],
  },
}

export default function MySubmissionsPage() {
  return <MySubmissionsPageClient />
}