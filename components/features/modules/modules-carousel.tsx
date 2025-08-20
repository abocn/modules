"use client"

import type { Module } from "@/types/module"
import { ModuleCard } from "@/components/features/modules/module-card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useState, useEffect } from "react"

interface ModulesCarouselProps {
  modules: Module[]
  onModuleSelect: (module: Module) => void
}

export function ModulesCarousel({ modules, onModuleSelect }: ModulesCarouselProps) {
  const [slidesToShow, setSlidesToShow] = useState(4)

  useEffect(() => {
    const updateSlidesToShow = () => {
      const width = window.innerWidth
      if (width < 640) {
        setSlidesToShow(1)
      } else if (width < 768) {
        setSlidesToShow(2)
      } else if (width < 1024) {
        setSlidesToShow(1)
      } else if (width < 1280) {
        setSlidesToShow(3)
      } else {
        setSlidesToShow(4)
      }
    }

    updateSlidesToShow()
    window.addEventListener('resize', updateSlidesToShow)
    return () => window.removeEventListener('resize', updateSlidesToShow)
  }, [])

  if (modules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No modules available</p>
      </div>
    )
  }

  const showNavigation = modules.length > slidesToShow

  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className="w-full relative"
    >
      <CarouselContent>
        {modules.slice(0, 8).map((module) => (
          <CarouselItem
            key={module.id}
            className="basis-[85%] sm:basis-1/2 md:basis-full lg:basis-1/3 lg:min-w-[280px] xl:basis-1/4 xl:min-w-[300px]"
          >
            <ModuleCard module={module} onClick={() => onModuleSelect(module)} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {showNavigation && (
        <>
          <CarouselPrevious className="hidden sm:flex -left-4 lg:-left-6" />
          <CarouselNext className="hidden sm:flex -right-4 lg:-right-6" />
        </>
      )}
    </Carousel>
  )
}