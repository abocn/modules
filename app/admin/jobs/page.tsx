import type { Metadata } from "next"
import { AdminJobsPageClient } from "@/components/pages/admin/admin-jobs-page-client"

export const metadata: Metadata = {
  title: "Jobs",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminJobsPage() {
  return <AdminJobsPageClient />
}