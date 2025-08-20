import type { Metadata } from "next"
import { AdminReviewsPageClient } from "@/components/pages/admin/admin-reviews-page-client"

export const metadata: Metadata = {
  title: "Manage Reviews",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminReviewsPage() {
  return <AdminReviewsPageClient />
}