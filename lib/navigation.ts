"use client"

import { useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"
import type { Module } from "@/types/module"

const ROUTE_MAP: Record<string, string> = {
  "home": "/",
  "search": "/search",
  "trending": "/trending",
  "profile": "/profile",
  "submit-module": "/submit",
  "my-submissions": "/my-submissions",
  "settings": "/settings",
  "admin-overview": "/admin",
  "admin-jobs": "/admin/jobs",
  "admin-release-schedule": "/admin/release-schedule",
  "admin-api-keys": "/admin/api-keys",
  "admin-modules": "/admin/modules",
  "admin-users": "/admin/users",
  "admin-reviews": "/admin/reviews",
  "admin-module-submissions": "/admin/module-submissions",
  "admin-audit": "/admin/audit",
  "featured": "/featured",
  "recent": "/recent",
  "recommended": "/recommended"
}

const ROUTE_TO_CATEGORY = Object.fromEntries(
  Object.entries(ROUTE_MAP).map(([category, route]) => [route, category])
)

export function useModuleNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const handleModuleSelect = useCallback((module: Module) => {
    router.push(`/module/${module.slug}`)
  }, [router])

  const handleCategorySelect = useCallback((category: string) => {
    const currentCategory = getCurrentCategory(pathname)

    if (category === currentCategory) return

    const route = ROUTE_MAP[category]
    if (route) {
      router.push(route)
    } else {
      router.push(`/category/${category}`)
    }
  }, [router, pathname])

  return {
    handleModuleSelect,
    handleCategorySelect
  }
}

export function getCurrentCategory(pathname: string): string {
  const category = ROUTE_TO_CATEGORY[pathname]
  if (category) return category

  if (pathname.startsWith('/category/')) {
    return pathname.split('/')[2]
  }

  if (pathname.startsWith('/module/')) {
    return 'module-detail'
  }

  if (pathname.startsWith('/search')) {
    return 'search'
  }

  return 'home'
}

export { ROUTE_MAP }