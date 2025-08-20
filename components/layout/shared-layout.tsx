"use client"

import { ReactNode, memo } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopNavBar } from "@/components/layout/top-nav-bar"

interface SharedLayoutProps {
  children: ReactNode
  currentPage: string
  showBackButton?: boolean
  onBack?: () => void
  selectedCategory?: string
  onCategorySelect?: (category: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

const SharedLayoutComponent = function SharedLayout({
  children,
  currentPage,
  showBackButton = false,
  onBack,
  selectedCategory = "home",
  onCategorySelect = () => {},
  searchQuery = "",
  onSearchChange = () => {},
}: SharedLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen">
          <TopNavBar
            currentPage={currentPage}
            showBackButton={showBackButton}
            onBack={onBack}
          />
          <main className="flex-1 w-full overflow-x-hidden overflow-y-auto -webkit-overflow-scrolling-touch overscroll-behavior-y-contain">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export const SharedLayout = memo(SharedLayoutComponent)