"use client"

import { useState, memo, useCallback } from "react"
import {
  Search,
  Home,
  Star,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Smartphone,
  Settings,
  Download,
  Code,
  Gamepad2,
  BarChart3,
  Package,
  Users,
  MessageSquare,
  Upload,
  FileCheck,
  FileText,
  ChevronDown,
  Layers,
  Play,
  LogIn,
  User,
  Flame,
  Calendar,
  Key,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DialogTrigger } from "@/components/ui/dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import { SigninDialog } from "@/components/shared/signin-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import Link from "next/link"

interface AppSidebarProps {
  selectedCategory: string
  onCategorySelect: (category: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const categories = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Advanced Search", icon: Search },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "featured", label: "Featured", icon: Star },
  { id: "recent", label: "Recently Updated", icon: Clock },
  { id: "recommended", label: "Recommended", icon: TrendingUp },
]

const moduleCategories = MODULE_CATEGORIES.map(cat => ({
  id: cat.id,
  label: cat.label,
  icon: {
    security: Shield,
    performance: Zap,
    ui: Smartphone,
    system: Settings,
    media: Download,
    development: Code,
    gaming: Gamepad2,
    miscellaneous: Layers,
  }[cat.id] || Settings,
}))

const accountCategories = [
  { id: "profile", label: "Profile", icon: User },
  { id: "submit-module", label: "Submit Module", icon: Upload },
  { id: "my-submissions", label: "My Submissions", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
]

const adminGeneralCategories = [
  { id: "admin-overview", label: "Overview", icon: BarChart3 },
  { id: "admin-jobs", label: "Jobs", icon: Play },
  { id: "admin-release-schedule", label: "Release Schedule", icon: Calendar },
  { id: "admin-api-keys", label: "API Keys", icon: Key },
  { id: "admin-users", label: "User Management", icon: Users },
  { id: "admin-audit", label: "Audit Log", icon: FileText },
]

const adminModuleCategories = [
  { id: "admin-modules", label: "Module Management", icon: Package },
  { id: "admin-module-submissions", label: "Module Submissions", icon: FileCheck },
  { id: "admin-reviews", label: "Module User Reviews", icon: MessageSquare },
]

const AppSidebarComponent = function AppSidebar({ selectedCategory, onCategorySelect, searchQuery, onSearchChange }: AppSidebarProps) {
  const { isAdmin, user } = useAdminAuth()
  const isMobile = useIsMobile()
  const [modulesCollapsed, setModulesCollapsed] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const handleCategorySelect = useCallback((categoryId: string) => {
    onCategorySelect(categoryId)
  }, [onCategorySelect])

  const handleSearchChange = useCallback((value: string) => {
    onSearchChange(value)
  }, [onSearchChange])

  const handleModulesToggle = useCallback((open: boolean) => {
    setModulesCollapsed(!open)
  }, [])

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Link href="/">
            <h1 className="text-3xl font-bold flex items-center">
              <span>m</span>
              <Package className="w-6 h-6" />
              <span>dules</span>
            </h1>
          </Link>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            autoFocus={false}
            tabIndex={isMobile ? -1 : 0}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Browse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    isActive={selectedCategory === category.id}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <category.icon />
                    <span>{category.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {moduleCategories.map((category) => (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    isActive={selectedCategory === category.id}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <category.icon />
                    <span>{category.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {user ? (
                accountCategories.map((category) => (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton
                      isActive={selectedCategory === category.id}
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      <category.icon />
                      <span>{category.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <SidebarMenuItem>
                  <SigninDialog
                    open={isLoginOpen}
                    onOpenChange={setIsLoginOpen}
                    trigger={
                      <DialogTrigger asChild>
                        <SidebarMenuButton>
                          <LogIn />
                          <span>Login</span>
                        </SidebarMenuButton>
                      </DialogTrigger>
                    }
                  />
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminGeneralCategories.map((category) => (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton
                      isActive={selectedCategory === category.id}
                      onClick={() => onCategorySelect(category.id)}
                    >
                      <category.icon />
                      <span>{category.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                <SidebarMenuItem>
                  <Collapsible open={!modulesCollapsed} onOpenChange={handleModulesToggle}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between group/collapsible">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">Modules</span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-all duration-300 ease-in-out group-hover/collapsible:text-sidebar-accent-foreground ${
                            modulesCollapsed ? 'rotate-[-90deg]' : 'rotate-0'
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="transition-all duration-300 ease-in-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                      <div className="relative ml-4 mt-2 space-y-1 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-sidebar-border/50">
                        {adminModuleCategories.map((category) => (
                          <div key={category.id} className="relative">
                            <div className="absolute left-2 top-3 w-3 h-px bg-sidebar-border/50" />
                            <SidebarMenuButton
                              isActive={selectedCategory === category.id}
                              onClick={() => handleCategorySelect(category.id)}
                              className="w-full justify-start text-sm ml-6 h-8 hover:bg-sidebar-accent/30 hover:translate-x-0.5 transition-all duration-200 group/item"
                            >
                              <category.icon className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-sidebar-accent-foreground transition-colors duration-200" />
                              <span className="text-muted-foreground group-hover/item:text-sidebar-accent-foreground group-data-[active=true]/item:text-sidebar-accent-foreground transition-colors duration-200">
                                {category.label}
                              </span>
                            </SidebarMenuButton>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}

export const AppSidebar = memo(AppSidebarComponent)
