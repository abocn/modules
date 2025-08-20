"use client"

import { useState } from "react"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminReleaseSchedule } from "@/components/features/admin/release-schedule/admin-release-schedule"
import { useModuleNavigation } from "@/lib/navigation"

export function AdminReleaseSchedulePageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Release Schedule"
        selectedCategory="admin-release-schedule"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AdminReleaseSchedule />
      </SharedLayout>
    </AdminGuard>
  )
}