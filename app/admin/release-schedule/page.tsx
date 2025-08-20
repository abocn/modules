import type { Metadata } from "next"
import { AdminReleaseSchedulePageClient } from "@/components/pages/admin/admin-release-schedule-page-client"

export const metadata: Metadata = {
  title: "Release Schedule Management",
  description: "Manage automated GitHub release syncing schedules.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminReleaseSchedulePage() {
  return <AdminReleaseSchedulePageClient />
}