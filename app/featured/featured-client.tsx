"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { MainContent } from "@/components/features/modules/main-content"
import { useModuleNavigation } from "@/lib/navigation"

export default function FeaturedClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleModuleSelect, handleCategorySelect } = useModuleNavigation()

  return (
    <SharedLayout
      currentPage="Featured"
      selectedCategory="featured"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <MainContent
        selectedCategory="featured"
        searchQuery={searchQuery}
        onModuleSelect={handleModuleSelect}
      />
    </SharedLayout>
  )
}