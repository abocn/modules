"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminOverview } from "@/components/features/admin/overview/admin-overview"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { useModuleNavigation } from "@/lib/navigation"

export function AdminPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Overview"
        selectedCategory="admin-overview"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AdminOverview />
      </SharedLayout>
    </AdminGuard>
  )
}