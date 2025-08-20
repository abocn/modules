"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface FlashlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  flashlightSize?: number
  flashlightIntensity?: number
  borderGlowIntensity?: number
  hoverBorderColor?: string
}

export function FlashlightCard({
  children,
  className,
  flashlightSize = 200,
  flashlightIntensity = 0.05,
  borderGlowIntensity = 0.1,
  ...props
}: FlashlightCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    cardRef.current.style.setProperty("--mouse-x", `${x}px`)
    cardRef.current.style.setProperty("--mouse-y", `${y}px`)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-500",
        "hover:shadow-lg hover:border-gray-400",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        "--mouse-x": "50%",
        "--mouse-y": "50%",
        "--flashlight-size": `${flashlightSize}px`,
        "--flashlight-intensity": flashlightIntensity,
        "--border-glow-intensity": borderGlowIntensity,
      } as React.CSSProperties}
      {...props}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 transition-opacity duration-500",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(var(--flashlight-size) circle at var(--mouse-x) var(--mouse-y), rgba(156,163,175,var(--flashlight-intensity)), transparent 40%)`,
        }}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 rounded-lg transition-opacity duration-500",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(calc(var(--flashlight-size) * 0.5) circle at var(--mouse-x) var(--mouse-y), rgba(156,163,175,var(--border-glow-intensity)), transparent 35%)`,
          WebkitMaskImage: "linear-gradient(transparent, transparent), linear-gradient(white, white)",
          WebkitMaskSize: "calc(100% - 2px) calc(100% - 2px), 100% 100%",
          WebkitMaskPosition: "1px 1px, 0 0",
          WebkitMaskRepeat: "no-repeat, no-repeat",
          WebkitMaskComposite: "xor",
          maskImage: "linear-gradient(transparent, transparent), linear-gradient(white, white)",
          maskSize: "calc(100% - 2px) calc(100% - 2px), 100% 100%",
          maskPosition: "1px 1px, 0 0",
          maskRepeat: "no-repeat, no-repeat",
          maskComposite: "exclude",
        }}
      />

      <div className="relative z-30">{children}</div>
    </div>
  )
}

export function FlashlightCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

export function FlashlightCardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

export function FlashlightCardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export function FlashlightCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function FlashlightCardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
}