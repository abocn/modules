"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { MainContent } from "@/components/features/modules/main-content"
import { useModuleNavigation } from "@/lib/navigation"

export function RecentPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleModuleSelect, handleCategorySelect } = useModuleNavigation()

  return (
    <SharedLayout
      currentPage="Recently Updated"
      selectedCategory="recent"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <MainContent
        selectedCategory="recent"
        searchQuery={searchQuery}
        onModuleSelect={handleModuleSelect}
      />
    </SharedLayout>
  )
}