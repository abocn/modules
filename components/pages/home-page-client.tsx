"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { MainContent } from "@/components/features/modules/main-content"
import { useModuleNavigation } from "@/lib/navigation"

export function HomePageClient() {
  const [selectedCategory, setSelectedCategory] = useState("home")
  const [searchQuery, setSearchQuery] = useState("")
  const { handleModuleSelect, handleCategorySelect: navHandleCategorySelect } = useModuleNavigation()

  const handleCategorySelect = (category: string) => {
    if (category === "home") {
      setSelectedCategory(category)
    } else {
      navHandleCategorySelect(category)
    }
  }

  return (
    <SharedLayout
      currentPage="Home"
      selectedCategory={selectedCategory}
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <MainContent
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onModuleSelect={handleModuleSelect}
      />
    </SharedLayout>
  )
}