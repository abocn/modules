import type { Metadata } from "next"
import { AdminUsersPageClient } from "@/components/pages/admin/admin-users-page-client"

export const metadata: Metadata = {
  title: "Manage Users",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminUsersPage() {
  return <AdminUsersPageClient />
}