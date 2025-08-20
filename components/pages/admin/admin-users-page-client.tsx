"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminUsers } from "@/components/features/admin/users/admin-users"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { useModuleNavigation } from "@/lib/navigation"

export function AdminUsersPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="User Management"
        selectedCategory="admin-users"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AdminUsers />
      </SharedLayout>
    </AdminGuard>
  )
}