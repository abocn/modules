"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminJobs } from "@/components/features/admin/jobs/admin-jobs"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { useModuleNavigation } from "@/lib/navigation"

export function AdminJobsPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Jobs"
        selectedCategory="admin-jobs"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AdminJobs />
      </SharedLayout>
    </AdminGuard>
  )
}