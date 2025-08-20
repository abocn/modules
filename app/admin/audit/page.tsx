import type { Metadata } from "next"
import { AuditPageClient } from "@/components/pages/admin/audit-page-client"

export const metadata: Metadata = {
  title: "Audit Log - Admin Dashboard",
  description: "Full audit log of recent administrative actions.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuditPage() {
  return <AuditPageClient />
}