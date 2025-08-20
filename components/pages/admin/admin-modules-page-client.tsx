"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminModules } from "@/components/features/admin/modules/admin-modules"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { useModuleNavigation } from "@/lib/navigation"

export function AdminModulesPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Module Management"
        selectedCategory="admin-modules"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AdminModules />
      </SharedLayout>
    </AdminGuard>
  )
}