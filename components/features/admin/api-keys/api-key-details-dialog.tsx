"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import {
  Copy,
  Shield,
  Clock,
  Globe,
  Key,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

interface ApiKeyWithUser {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  lastUsedIp: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  userId: string
  userName: string
  userEmail: string
}

interface ApiKeyDetailsDialogProps {
  apiKey: ApiKeyWithUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevoke?: (key: ApiKeyWithUser) => void
}

export function ApiKeyDetailsDialog({
  apiKey,
  open,
  onOpenChange,
  onRevoke
}: ApiKeyDetailsDialogProps) {
  const [copying, setCopying] = useState(false)

  if (!apiKey) return null

  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
  const isRevoked = !!apiKey.revokedAt

  const getStatusBadge = () => {
    if (isRevoked) {
      return <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Revoked
      </Badge>
    }
    if (isExpired) {
      return <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    }
    return <Badge variant="default" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </Badge>
  }

  const copyToClipboard = async (text: string, label: string) => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch {
      toast.error(`Failed to copy ${label}`)
    } finally {
      setCopying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Key Information</h3>
              {getStatusBadge()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Key Name</Label>
                <p className="text-sm font-medium">{apiKey.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Key Prefix</Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {apiKey.keyPrefix}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.keyPrefix, "Key prefix")}
                    disabled={copying}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Key ID</Label>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono">{apiKey.id}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.id, "Key ID")}
                    disabled={copying}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">User Name</Label>
                <p className="text-sm font-medium">{apiKey.userName}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">User Email</Label>
                <p className="text-sm">{apiKey.userEmail}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <p className="text-xs font-mono">{apiKey.userId}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions & Scopes
            </h3>
            <div className="flex flex-wrap gap-2">
              {apiKey.scopes.map((scope) => (
                <Badge key={scope} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Usage Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Used
                </Label>
                <p className="text-sm">
                  {apiKey.lastUsedAt
                    ? format(new Date(apiKey.lastUsedAt), "PPp")
                    : "Never used"}
                </p>
              </div>
              {apiKey.lastUsedIp && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Last Used IP
                  </Label>
                  <p className="text-sm font-mono">{apiKey.lastUsedIp}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timestamps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Created At</Label>
                <p className="text-sm">{format(new Date(apiKey.createdAt), "PPp")}</p>
              </div>
              {apiKey.expiresAt && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Expires At</Label>
                  <p className="text-sm flex items-center gap-2">
                    {format(new Date(apiKey.expiresAt), "PPp")}
                    {isExpired && (
                      <Badge variant="secondary" className="text-xs">
                        Expired
                      </Badge>
                    )}
                  </p>
                </div>
              )}
              {apiKey.revokedAt && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Revoked At</Label>
                  <p className="text-sm">{format(new Date(apiKey.revokedAt), "PPp")}</p>
                </div>
              )}
            </div>
          </div>

          {!isRevoked && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {onRevoke && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Are you sure you want to revoke the API key "${apiKey.name}"? This action cannot be undone.`)) {
                        onRevoke(apiKey)
                        onOpenChange(false)
                      }
                    }}
                  >
                    Revoke Key
                  </Button>
                )}
              </div>
            </>
          )}

          {isRevoked && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-destructive">This API key has been revoked</p>
                  <p className="text-muted-foreground">
                    Revoked keys cannot be reactivated. The user must create a new API key if needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}