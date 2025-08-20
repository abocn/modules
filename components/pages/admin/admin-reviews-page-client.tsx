"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdminReviews } from "@/components/features/admin/reviews/admin-reviews"
import { AdminGuard } from "@/components/features/admin/guards/admin-guard"
import { useModuleNavigation } from "@/lib/navigation"

export function AdminReviewsPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()

  return (
    <AdminGuard>
      <SharedLayout
        currentPage="Review Management"
        selectedCategory="admin-reviews"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <AdminReviews />
      </SharedLayout>
    </AdminGuard>
  )
}