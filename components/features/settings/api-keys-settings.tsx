"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { useCachedAuth } from "@/hooks/use-cached-auth"
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  ExternalLink,
  Info
} from "lucide-react"

/**
 * Represents an API key with its metadata and permissions
 */
interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

/**
 * API Keys settings component for managing user API keys
 * Provides CRUD operations for API keys with proper scope management
 * and security warnings
 */
export function ApiKeysSettings() {
  const { isAdmin } = useCachedAuth()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [newKey, setNewKey] = useState<string>("")
  const [keyName, setKeyName] = useState("")
  const [keyExpiry, setKeyExpiry] = useState("90days")
  const [keyScopes, setKeyScopes] = useState<string[]>(["read"])

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/user/api-keys")
      if (!response.ok) throw new Error("Failed to fetch API keys")
      const data = await response.json()
      setKeys(data.keys)
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  const createApiKey = async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName,
          expiresIn: keyExpiry,
          scopes: keyScopes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create API key")
      }

      const data = await response.json()
      setNewKey(data.key)
      setShowCreateDialog(false)
      setShowKeyDialog(true)
      await fetchApiKeys()

      setKeyName("")
      setKeyExpiry("90days")
      setKeyScopes(["read"])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key")
    } finally {
      setCreating(false)
    }
  }

  const revokeApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/user/api-keys/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to revoke API key")

      toast.success("API key revoked successfully")
      await fetchApiKeys()
    } catch {
      toast.error("Failed to revoke API key")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("API key copied to clipboard")
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to the modules repository
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              API keys provide programmatic access to your account and should be treated like passwords.
              <span className="flex items-center gap-1">
                They can have read-only, read-write{isAdmin ? ", or admin" : ""} permissions. View the complete API documentation at
                <a href="/api-docs" className="font-medium underline inline-flex items-center gap-1 hover:text-primary transition-all duration-300" target="_blank" rel="noopener noreferrer">
                  /api-docs
                  <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8">
              <KeyRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No API keys yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first API key to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{key.keyPrefix}...</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        isExpired(key.expiresAt) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(key.expiresAt), { addSuffix: true })}
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeApiKey(key.id, key.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access. Treat this like a password - the key will only be shown once and cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production App"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expiry">Expiration</Label>
              <Select value={keyExpiry} onValueChange={setKeyExpiry}>
                <SelectTrigger id="expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">30 days</SelectItem>
                  <SelectItem value="90days">90 days</SelectItem>
                  <SelectItem value="1year">1 year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="read"
                    checked={keyScopes.includes("read")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setKeyScopes([...keyScopes, "read"])
                      } else {
                        setKeyScopes(keyScopes.filter((s) => s !== "read"))
                      }
                    }}
                  />
                  <label
                    htmlFor="read"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Read access
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="write"
                    checked={keyScopes.includes("write")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setKeyScopes([...keyScopes, "write"])
                      } else {
                        setKeyScopes(keyScopes.filter((s) => s !== "write"))
                      }
                    }}
                  />
                  <label
                    htmlFor="write"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Write access
                  </label>
                </div>
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="admin"
                      checked={keyScopes.includes("admin")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setKeyScopes([...keyScopes, "admin"])
                        } else {
                          setKeyScopes(keyScopes.filter((s) => s !== "admin"))
                        }
                      }}
                    />
                    <label
                      htmlFor="admin"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Admin access
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createApiKey} disabled={creating}>
              {creating ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your API key has been created. Copy it now - you won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Store this key securely. It will not be shown again.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
              {newKey}
            </div>
            <Button
              className="w-full"
              onClick={() => copyToClipboard(newKey)}
            >
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}