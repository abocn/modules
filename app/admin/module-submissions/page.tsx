import type { Metadata } from "next"
import { AdminModuleSubmissionsPageClient } from "@/components/pages/admin/admin-module-submissions-page-client"

export const metadata: Metadata = {
  title: "Module Submissions",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminModuleSubmissionsPage() {
  return <AdminModuleSubmissionsPageClient />
}