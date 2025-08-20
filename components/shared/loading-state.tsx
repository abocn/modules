"use client"

import { Spinner } from "@/components/ui/spinner"

interface LoadingStateProps {
  status: string
  className?: string
}

export function LoadingState({ status, className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-3 ${className || ''}`}>
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  )
}