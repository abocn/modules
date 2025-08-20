import type { Metadata } from "next"
import { AdminApiKeysPageClient } from "@/components/pages/admin/admin-api-keys-page-client"

export const metadata: Metadata = {
  title: "API Keys Management",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminApiKeysPage() {
  return <AdminApiKeysPageClient />
}