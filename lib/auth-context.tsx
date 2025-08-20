"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react'
import { useSession } from '@/lib/auth-client'

interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
  image?: string
}

interface CachedAuthState {
  user: AuthUser | null
  isLoading: boolean
  isAdmin: boolean
  lastFetch: number
  error?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAdmin: boolean
  error?: string
  refreshAuth: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const CACHE_TTL = 30 * 1000
const STALE_TIME = 10 * 1000

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, isPending: sessionLoading, refetch } = useSession()
  const [cachedState, setCachedState] = useState<CachedAuthState>({
    user: null,
    isLoading: true,
    isAdmin: false,
    lastFetch: 0
  })

  const isDataStale = useMemo(() => {
    return Date.now() - cachedState.lastFetch > STALE_TIME
  }, [cachedState.lastFetch])

  const isDataExpired = useMemo(() => {
    return Date.now() - cachedState.lastFetch > CACHE_TTL
  }, [cachedState.lastFetch])

  const updateCache = useCallback((user: AuthUser | null, loading: boolean, error?: string) => {
    setCachedState(prev => ({
      ...prev,
      user,
      isLoading: loading,
      isAdmin: user?.role === 'admin',
      lastFetch: Date.now(),
      error
    }))
  }, [])

  const refreshAuth = useCallback(async () => {
    if (refetch) {
      await refetch()
    }
    setCachedState(prev => ({
      ...prev,
      lastFetch: 0
    }))
  }, [refetch])

  useEffect(() => {
    if (!sessionLoading && (isDataExpired || cachedState.lastFetch === 0)) {
      const user = session?.user as AuthUser | undefined
      updateCache(user || null, false)
    }
  }, [session, sessionLoading, isDataExpired, cachedState.lastFetch, updateCache])

  const contextValue = useMemo((): AuthContextValue => {
    if (sessionLoading && cachedState.lastFetch === 0) {
      return {
        user: null,
        isLoading: true,
        isAdmin: false,
        refreshAuth
      }
    }

    if (isDataStale && !isDataExpired && cachedState.user !== null) {
      return {
        user: cachedState.user,
        isLoading: false,
        isAdmin: cachedState.isAdmin,
        error: cachedState.error,
        refreshAuth
      }
    }

    return {
      user: cachedState.user,
      isLoading: cachedState.isLoading,
      isAdmin: cachedState.isAdmin,
      error: cachedState.error,
      refreshAuth
    }
  }, [sessionLoading, cachedState, isDataStale, isDataExpired, refreshAuth])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useAdminAuth() {
  const auth = useAuth()
  return {
    isAdmin: auth.isAdmin,
    isLoading: auth.isLoading,
    user: auth.user
  }
}