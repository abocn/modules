import { FlashlightCard, FlashlightCardContent } from "@/components/ui/flashlight-card"
import { Skeleton } from "@/components/ui/skeleton"

export function ModuleCardSkeleton() {
  return (
    <FlashlightCard
      className="h-[270px] flex flex-col border-border py-0 pointer-events-none"
      flashlightSize={0}
      flashlightIntensity={0}
      borderGlowIntensity={0}
    >
      <FlashlightCardContent className="p-4 pb-3 flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3 min-h-[60px]">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>

        <div className="mb-3 h-12">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-5/6" />
        </div>

        <div className="flex items-center gap-1 mb-3 h-4">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>

        <div className="flex flex-wrap gap-1 mb-3 h-5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        <div className="mb-2 h-5">
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </FlashlightCardContent>
    </FlashlightCard>
  )
}