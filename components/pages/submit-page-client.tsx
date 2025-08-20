"use client"

import { useState } from "react"
import { SharedLayout } from "@/components/layout/shared-layout"
import { SubmitModule } from "@/components/features/submissions/submit-module"
import { useModuleNavigation } from "@/lib/navigation"
import { useSession } from "@/lib/auth-client"
import { LoadingState } from "@/components/shared/loading-state"

export function SubmitPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { handleCategorySelect } = useModuleNavigation()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <SharedLayout
        currentPage="Submit Module"
        selectedCategory="submit-module"
        onCategorySelect={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="p-6 space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Submit New Module</h1>
          </div>
          <LoadingState status="Loading..." />
        </div>
      </SharedLayout>
    )
  }

  return (
    <SharedLayout
      currentPage="Submit Module"
      selectedCategory="submit-module"
      onCategorySelect={handleCategorySelect}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <SubmitModule
        userId={session?.user?.id}
      />
    </SharedLayout>
  )
}