"use client"

import { ModuleCardSkeleton } from "./module-card-skeleton"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

export function CarouselSkeleton() {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className="w-full relative pointer-events-none"
    >
      <CarouselContent>
        {[...Array(8)].map((_, i) => (
          <CarouselItem
            key={i}
            className="basis-[85%] sm:basis-1/2 md:basis-full lg:basis-1/3 lg:min-w-[280px] xl:basis-1/4 xl:min-w-[300px]"
          >
            <ModuleCardSkeleton />
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="hidden sm:flex">
        <div className="absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2">
          <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse" />
        </div>
        <div className="absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2">
          <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse" />
        </div>
      </div>
    </Carousel>
  )
}