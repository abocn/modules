"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { MainContent } from "@/components/features/modules/main-content"
import { useModuleNavigation } from "@/lib/navigation"

export function RecommendedPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleModuleSelect, handleCategorySelect } = useModuleNavigation()

  return (
    <SharedLayout
      currentPage="Recommended"
      selectedCategory="recommended"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <MainContent
        selectedCategory="recommended"
        searchQuery={searchQuery}
        onModuleSelect={handleModuleSelect}
      />
    </SharedLayout>
  )
}