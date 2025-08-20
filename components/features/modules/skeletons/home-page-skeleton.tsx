"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { CarouselSkeleton } from "./carousel-skeleton"
import { ClockCardSkeleton, StatsCardSkeleton, TelegramCardSkeleton } from "./stats-card-skeleton"

export function HomePageSkeleton() {
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-6 pr-0 sm:pr-6 space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
        </div>

        <section className="pr-6 sm:pr-0">
          <div className="space-y-3 sm:space-y-4 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <ClockCardSkeleton />
              <StatsCardSkeleton />
              <div className="col-span-2 md:col-span-1">
                <TelegramCardSkeleton />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Featured Modules</h2>
          <CarouselSkeleton />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recently Updated</h2>
          <CarouselSkeleton />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recommended</h2>
          <CarouselSkeleton />
        </section>
      </div>
    </div>
  )
}