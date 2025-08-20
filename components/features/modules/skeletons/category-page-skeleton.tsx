"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { ModuleCardSkeleton } from "./module-card-skeleton"

interface CategoryPageSkeletonProps {
  title?: string
}

export function CategoryPageSkeleton({ title }: CategoryPageSkeletonProps) {
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          {title ? (
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
          ) : (
            <Skeleton className="h-9 w-48 mb-2" />
          )}
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}