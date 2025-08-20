import { StatCard } from "@/components/features/stats/stat-card"
import { Skeleton } from "@/components/ui/skeleton"

export function StatsCardSkeleton() {
  return (
    <StatCard responsiveLayout>
      <div className="flex md:hidden items-center justify-between w-full h-full">
        <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 rounded" />
        <div className="text-right">
          <Skeleton className="h-7 sm:h-9 w-20 mb-1" />
          <Skeleton className="h-3 sm:h-4 w-24" />
        </div>
      </div>

      <div className="hidden md:block md:h-full md:min-h-[120px]">
        <div className="absolute top-6 left-6">
          <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 rounded" />
        </div>
        <div className="absolute bottom-6 right-6 text-right">
          <Skeleton className="h-7 sm:h-9 w-20 mb-1 ml-auto" />
          <Skeleton className="h-3 sm:h-4 w-24 ml-auto" />
        </div>
      </div>
    </StatCard>
  )
}

export function ClockCardSkeleton() {
  return (
    <StatCard>
      <div className="absolute bottom-3 right-3 z-10">
        <Skeleton className="w-8 h-5 rounded" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <Skeleton className="h-9 sm:h-11 w-[72px]" />
            <Skeleton className="h-6 sm:h-7 w-8" />
            <Skeleton className="h-4 sm:h-5 w-8 ml-1" />
          </div>
          <Skeleton className="h-3 sm:h-4 w-24 mt-1" />
        </div>
      </div>
    </StatCard>
  )
}

export function TelegramCardSkeleton() {
  return (
    <StatCard className="group">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Skeleton className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-5 sm:h-6 w-36" />
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
          <div className="relative flex items-center p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <div>
                <Skeleton className="h-3 sm:h-4 w-12 mb-1" />
                <Skeleton className="h-2 sm:h-3 w-16" />
              </div>
            </div>
            <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3">
              <Skeleton className="w-full h-full" />
            </div>
          </div>

          <div className="relative flex items-center p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <div>
                <Skeleton className="h-3 sm:h-4 w-8 mb-1" />
                <Skeleton className="h-2 sm:h-3 w-20" />
              </div>
            </div>
            <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3">
              <Skeleton className="w-full h-full" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] sm:text-xs">
          <div className="flex -space-x-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-muted to-muted/50 border-2 border-background animate-pulse"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-muted to-muted/40 border-2 border-background animate-pulse"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-muted to-muted/30 border-2 border-background animate-pulse"></div>
          </div>
          <Skeleton className="h-2 sm:h-3 w-24" />
        </div>
      </div>
    </StatCard>
  )
}