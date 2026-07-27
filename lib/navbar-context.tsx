'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

type RefreshCallback = () => unknown;

interface NavbarContextType {
  onRefresh: RefreshCallback | null;
  isRefreshing: boolean;
  setRefreshHandler: (onRefresh: RefreshCallback | null, isRefreshing: boolean) => void;
  clearRefreshHandler: () => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: ReactNode }) {
  const [onRefresh, setOnRefresh] = useState<RefreshCallback | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const setRefreshHandler = useCallback((handler: RefreshCallback | null, refreshing: boolean) => {
    setOnRefresh(() => handler);
    setIsRefreshing(refreshing);
  }, []);

  const clearRefreshHandler = useCallback(() => {
    setOnRefresh(null);
    setIsRefreshing(false);
  }, []);

  return (
    <NavbarContext.Provider
      value={{
        onRefresh,
        isRefreshing,
        setRefreshHandler,
        clearRefreshHandler,
      }}
    >
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (!context) {
    return { onRefresh: null, isRefreshing: false };
  }
  return { onRefresh: context.onRefresh, isRefreshing: context.isRefreshing };
}

export function useNavbarRefresh(onRefresh?: RefreshCallback | null, isRefreshing?: boolean) {
  const context = useContext(NavbarContext);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const stableRefresh = useCallback(() => {
    return onRefreshRef.current?.();
  }, []);

  const hasRefresh = Boolean(onRefresh);
  const refreshing = Boolean(isRefreshing);

  useEffect(() => {
    if (!context) return;

    if (hasRefresh) {
      context.setRefreshHandler(stableRefresh, refreshing);
    } else {
      context.clearRefreshHandler();
    }

    return () => {
      context.clearRefreshHandler();
    };
  }, [context, hasRefresh, refreshing, stableRefresh]);
}
