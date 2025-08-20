"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SharedLayout } from "@/components/layout/shared-layout"
import { useModuleNavigation } from "@/lib/navigation"

interface ModulePageClientProps {
  children: React.ReactNode
  moduleName: string
}

export function ModulePageClient({ children, moduleName }: ModulePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { handleCategorySelect } = useModuleNavigation()

  const handleBack = () => {
    router.back()
  }

  return (
    <SharedLayout
      currentPage={moduleName}
      showBackButton={true}
      onBack={handleBack}
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {children}
    </SharedLayout>
  )
}