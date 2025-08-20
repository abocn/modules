"use client"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/shared/mode-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogIn, ArrowLeft, LogOut, User, Settings, Loader2 } from "lucide-react"
import { useState } from "react"
import { DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { signOut } from "@/lib/auth-client"
import { useCachedAuth } from "@/hooks/use-cached-auth"
import { SigninDialog } from "@/components/shared/signin-dialog"
import Link from "next/link"

interface TopNavBarProps {
  currentPage?: string
  showBackButton?: boolean
  onBack?: () => void
}

export function TopNavBar({ currentPage = "Home", showBackButton = false, onBack }: TopNavBarProps) {
  const { user, isLoading, refreshAuth } = useCachedAuth()
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            localStorage.clear()
            sessionStorage.clear()
            refreshAuth()
            window.location.href = '/'
          }
        }
      })
    } catch (error) {
      console.error('Sign out error:', error)
      localStorage.clear()
      sessionStorage.clear()
      refreshAuth()
      window.location.href = '/'
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 w-full">
      <div className="flex h-14 items-center justify-between px-3 sm:px-6 w-full max-w-full">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <SidebarTrigger />
          {showBackButton && onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Back</span>
            </Button>
          )}
          <h2 className="text-base sm:text-lg font-semibold truncate">{currentPage}</h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <ModeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    {user?.image && <AvatarImage src={user.image} alt={user?.name || 'Loading...'} />}
                    <AvatarFallback>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </>
                    ) : (
                      <>
                        {user?.name && (
                          <p className="font-medium">{user.name}</p>
                        )}
                        {user?.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {!isLoading && user && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <SigninDialog
              open={isLoginOpen}
              onOpenChange={setIsLoginOpen}
              trigger={
                <DialogTrigger asChild>
                  <Button size="sm">
                    <LogIn />
                    Login
                  </Button>
                </DialogTrigger>
              }
            />
          )}
        </div>
      </div>
    </header>
  )
}
