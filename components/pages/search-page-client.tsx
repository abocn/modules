"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { AdvancedSearch } from "@/components/features/search/advanced-search"
import { useModuleNavigation } from "@/lib/navigation"

export function SearchPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleModuleSelect, handleCategorySelect } = useModuleNavigation()

  return (
    <SharedLayout
      currentPage="Search"
      selectedCategory="search"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <AdvancedSearch onModuleSelect={handleModuleSelect} />
    </SharedLayout>
  )
}