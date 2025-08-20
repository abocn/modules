"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "@/lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitHubPATSettings } from "./github-pat-settings"
import { ApiKeysSettings } from "./api-keys-settings"
import { ProfilePictureUpload } from "./profile-picture-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Edit, Save, X, Mail, Shield, User } from "lucide-react"
import { toast } from "sonner"

interface UserRole {
  role: string | null
  isLoading: boolean
}

export function UserSettings() {
  const { data: session } = useSession()
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>({ role: null, isLoading: true })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.name && !isEditingName) {
      setNameValue(session.user.name)
    }
  }, [session?.user?.name, isEditingName])

  useEffect(() => {
    setIsLoading(false)
  }, [session])

  useEffect(() => {
    if (session?.user?.id) {
      setUserRole({ role: null, isLoading: true })
      fetch(`/api/user/role`)
        .then(res => res.json())
        .then(data => setUserRole({ role: data.role, isLoading: false }))
        .catch(err => {
          console.error('Failed to fetch user role:', err)
          setUserRole({ role: null, isLoading: false })
        })
    }
  }, [session?.user?.id])

  const handleEditName = useCallback(() => {
    setNameValue(session?.user?.name || "")
    setIsEditingName(true)
  }, [session?.user?.name])

  const handleCancelEdit = useCallback(() => {
    setNameValue(session?.user?.name || "")
    setIsEditingName(false)
  }, [session?.user?.name])

  const handleSaveName = useCallback(async () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    if (nameValue === session?.user?.name) {
      setIsEditingName(false)
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: nameValue.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update name")
      }

      setIsEditingName(false)
      toast.success("Name updated successfully")
      window.location.reload()
    } catch (error) {
      console.error("Error updating name:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update name")
    } finally {
      setIsUpdating(false)
    }
  }, [nameValue, session?.user?.name])

  const getRoleColor = useMemo(() => {
    if (userRole.role === 'admin') return 'destructive'
    return 'secondary'
  }, [userRole.role])

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 animate-pulse">
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-8">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <Skeleton className="h-4 w-32 my-[9.5px]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border flex items-center">
                <Skeleton className="h-4 w-48 my-[5.5px]" />
                <Skeleton className="h-5 w-16 ml-2 rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <Skeleton className="h-6 w-16 rounded-full mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-64" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-start gap-2">
                <Skeleton className="w-4 h-4 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-72" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
            </div>

            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="overflow-hidden">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Please sign in to view settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl pb-8">
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-8">
            <ProfilePictureUpload
              currentImage={session.user.image}
              userName={session.user.name}
            />
            <div className="flex-1">
              <CardTitle className="text-xl">Account Information</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Display Name</label>
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="Enter your display name"
                  disabled={isUpdating}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveName()
                    } else if (e.key === "Escape") {
                      handleCancelEdit()
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isUpdating || !nameValue.trim()}
                  className="shrink-0"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <span className="text-sm font-medium">{session.user.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditName}
                  className="h-8 px-2"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Email Address</label>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <span className="text-sm font-medium">{session.user.email}</span>
              {session.user.emailVerified && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Account Role</label>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              {userRole.isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <Badge variant={getRoleColor} className="capitalize">
                  {userRole.role}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <GitHubPATSettings />

      <ApiKeysSettings />
    </div>
  )
}