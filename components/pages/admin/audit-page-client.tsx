"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AuditLog } from "@/components/features/admin/audit/audit-log"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { useModuleNavigation } from "@/lib/navigation"

export function AuditPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Audit Log"
        selectedCategory="admin-audit"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AuditLog />
      </SharedLayout>
    </AdminGuard>
  )
}