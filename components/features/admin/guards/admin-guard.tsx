"use client"

import { useRequireAdmin } from '@/hooks/use-admin-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingState } from '@/components/shared/loading-state'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, isLoading, user } = useRequireAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
      return
    }

    if (!isLoading && user && !isAdmin) {
      router.push('/')
      return
    }
  }, [isAdmin, isLoading, user, router])

  if (isLoading || !isAdmin) {
    const status = !user ? "Checking authentication..." : !isAdmin ? "Verifying admin access..." : "Loading admin panel..."

    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="p-6">
          <LoadingState status={status} />
        </div>
      </div>
    )
  }

  return <>{children}</>
}