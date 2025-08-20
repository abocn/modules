"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { MainContent } from "@/components/features/modules/main-content"
import { useModuleNavigation } from "@/lib/navigation"

interface CategoryPageClientProps {
  category: string
  categoryTitle: string
}

export function CategoryPageClient({ category, categoryTitle }: CategoryPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleModuleSelect, handleCategorySelect } = useModuleNavigation()

  return (
    <SharedLayout
      currentPage={categoryTitle}
      selectedCategory={category}
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <MainContent
        selectedCategory={category}
        searchQuery={searchQuery}
        onModuleSelect={handleModuleSelect}
      />
    </SharedLayout>
  )
}