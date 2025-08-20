import type { Metadata } from "next"
import { AdminModulesPageClient } from "@/components/pages/admin/admin-modules-page-client"

export const metadata: Metadata = {
  title: "Manage Modules",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminModulesPage() {
  return <AdminModulesPageClient />
}