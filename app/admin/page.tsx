import type { Metadata } from "next"
import { AdminPageClient } from "@/components/pages/admin/admin-page-client"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminPage() {
  return <AdminPageClient />
}