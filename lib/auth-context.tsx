'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useSession } from '@/lib/auth-client';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  image?: string;
}

interface CachedAuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  lastFetch: number;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  error?: string;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CACHE_TTL = 30 * 1000;
const STALE_TIME = 10 * 1000;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, isPending: sessionLoading, refetch } = useSession();
  const [cachedState, setCachedState] = useState<CachedAuthState>({
    user: null,
    isLoading: true,
    isAdmin: false,
    lastFetch: 0,
  });
  const [isDataStale, setIsDataStale] = useState(false);
  const [isDataExpired, setIsDataExpired] = useState(true);

  useEffect(() => {
    if (cachedState.lastFetch === 0) {
      queueMicrotask(() => {
        setIsDataStale(false);
        setIsDataExpired(true);
      });
      return;
    }

    const now = Date.now();
    const elapsed = now - cachedState.lastFetch;
    const staleIn = Math.max(0, STALE_TIME - elapsed);
    const expiredIn = Math.max(0, CACHE_TTL - elapsed);

    queueMicrotask(() => {
      setIsDataStale(elapsed > STALE_TIME);
      setIsDataExpired(elapsed > CACHE_TTL);
    });

    const staleTimer = setTimeout(() => setIsDataStale(true), staleIn);
    const expiredTimer = setTimeout(() => setIsDataExpired(true), expiredIn);

    return () => {
      clearTimeout(staleTimer);
      clearTimeout(expiredTimer);
    };
  }, [cachedState.lastFetch]);

  const updateCache = useCallback((user: AuthUser | null, loading: boolean, error?: string) => {
    setCachedState((prev) => ({
      ...prev,
      user,
      isLoading: loading,
      isAdmin: user?.role === 'admin',
      lastFetch: Date.now(),
      error,
    }));
  }, []);

  const refreshAuth = useCallback(async () => {
    if (refetch) {
      await refetch();
    }
    setCachedState((prev) => ({
      ...prev,
      lastFetch: 0,
    }));
  }, [refetch]);

  useEffect(() => {
    if (!sessionLoading && (isDataExpired || cachedState.lastFetch === 0)) {
      const initialUser = session?.user as AuthUser | undefined;
      if (!initialUser) {
        queueMicrotask(() => updateCache(null, false));
        return;
      }

      let isMounted = true;

      fetch('/api/user/role')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted) return;
          const role = data?.role || initialUser.role;
          updateCache({ ...initialUser, role }, false);
        })
        .catch(() => {
          if (!isMounted) return;
          updateCache(initialUser, false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [session, sessionLoading, isDataExpired, cachedState.lastFetch, updateCache]);

  const contextValue = useMemo((): AuthContextValue => {
    if ((sessionLoading || cachedState.isLoading) && cachedState.lastFetch === 0) {
      return {
        user: null,
        isLoading: true,
        isAdmin: false,
        refreshAuth,
      };
    }

    if (isDataStale && !isDataExpired && cachedState.user !== null) {
      return {
        user: cachedState.user,
        isLoading: false,
        isAdmin: cachedState.isAdmin,
        error: cachedState.error,
        refreshAuth,
      };
    }

    return {
      user: cachedState.user,
      isLoading: cachedState.isLoading,
      isAdmin: cachedState.isAdmin,
      error: cachedState.error,
      refreshAuth,
    };
  }, [sessionLoading, cachedState, isDataStale, isDataExpired, refreshAuth]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAdminAuth() {
  const auth = useAuth();
  return {
    isAdmin: auth.isAdmin,
    isLoading: auth.isLoading,
    user: auth.user,
  };
}
