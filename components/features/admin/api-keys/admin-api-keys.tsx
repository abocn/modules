"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Filters, FilterField } from "@/components/features/admin/filters"
import type { ApiKeyAdvancedFilters } from "@/types/admin"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  Trash2,
  KeyRound,
  Users,
  ShieldOff,
  Clock,
  Activity,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  RefreshCw,
  Plus
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ApiKeyDetailsDialog } from "./api-key-details-dialog"
import { CreateApiKeyDialog } from "./create-api-key-dialog"

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

interface ApiKeyStats {
  totalKeys: number
  activeKeys: number
  revokedKeys: number
  expiredKeys: number
  recentlyUsed: number
}

interface AdminApiKeysProps {
  searchQuery: string
}

export function AdminApiKeys({ searchQuery }: AdminApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyWithUser[]>([])
  const [filteredKeys, setFilteredKeys] = useState<ApiKeyWithUser[]>([])
  const [stats, setStats] = useState<ApiKeyStats>({
    totalKeys: 0,
    activeKeys: 0,
    revokedKeys: 0,
    expiredKeys: 0,
    recentlyUsed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const [selectedKey, setSelectedKey] = useState<ApiKeyWithUser | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [advancedFilters, setAdvancedFilters] = useState<ApiKeyAdvancedFilters>({
    query: "",
    status: "all",
    scope: "all",
    userFilter: "all",
    createdDateFrom: undefined,
    createdDateTo: undefined,
    lastUsedDateFrom: undefined,
    lastUsedDateTo: undefined,
    expirationStatus: "all"
  })

  const filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'query',
      label: 'Search API Keys',
      placeholder: 'Search by name, user, email, or key prefix...'
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'revoked', label: 'Revoked' },
        { value: 'expired', label: 'Expired' }
      ]
    },
    {
      type: 'select',
      key: 'scope',
      label: 'Scope',
      options: [
        { value: 'read', label: 'Read Only' },
        { value: 'write', label: 'Write Access' },
        { value: 'admin', label: 'Admin Access' }
      ]
    },
    {
      type: 'select',
      key: 'expirationStatus',
      label: 'Expiration',
      options: [
        { value: 'never', label: 'Never Expires' },
        { value: 'expires', label: 'Has Expiration' },
        { value: 'expiring-soon', label: 'Expiring Soon' }
      ]
    },
    {
      type: 'date',
      key: 'createdDateFrom',
      label: 'Created From'
    },
    {
      type: 'date',
      key: 'createdDateTo',
      label: 'Created To'
    },
    {
      type: 'date',
      key: 'lastUsedDateFrom',
      label: 'Last Used From'
    },
    {
      type: 'date',
      key: 'lastUsedDateTo',
      label: 'Last Used To'
    }
  ]

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/api-keys")
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to view API keys")
        }
        throw new Error("Failed to fetch API keys")
      }
      const data = await response.json()
      setKeys(data.keys)
      setStats(data.stats)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchApiKeys()
    fetchUsers()
  }, [fetchApiKeys, fetchUsers])

  useEffect(() => {
    const query = (searchQuery || (typeof advancedFilters.query === 'string' ? advancedFilters.query : '') || "").toLowerCase()

    let filtered = keys

    if (query) {
      filtered = filtered.filter(
        (key) =>
          key.name.toLowerCase().includes(query) ||
          key.userName.toLowerCase().includes(query) ||
          key.userEmail.toLowerCase().includes(query) ||
          key.keyPrefix.toLowerCase().includes(query)
      )
    }

    if (typeof advancedFilters.status === 'string' && advancedFilters.status !== "all") {
      filtered = filtered.filter((key) => {
        if (advancedFilters.status === "active") {
          return !key.revokedAt && !isExpired(key.expiresAt)
        }
        if (advancedFilters.status === "revoked") {
          return key.revokedAt
        }
        if (advancedFilters.status === "expired") {
          return isExpired(key.expiresAt)
        }
        return true
      })
    }

    if (typeof advancedFilters.scope === 'string' && advancedFilters.scope !== "all") {
      filtered = filtered.filter((key) =>
        key.scopes.some(scope => scope.toLowerCase().includes(advancedFilters.scope as string))
      )
    }

    if (typeof advancedFilters.expirationStatus === 'string' && advancedFilters.expirationStatus !== "all") {
      filtered = filtered.filter((key) => {
        if (advancedFilters.expirationStatus === "never") {
          return !key.expiresAt
        }
        if (advancedFilters.expirationStatus === "expires") {
          return key.expiresAt
        }
        if (advancedFilters.expirationStatus === "expiring-soon") {
          if (!key.expiresAt) return false
          const daysUntilExpiry = Math.ceil((new Date(key.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0
        }
        return true
      })
    }

    if (typeof advancedFilters.createdDateFrom === 'string' && advancedFilters.createdDateFrom) {
      filtered = filtered.filter((key) =>
        new Date(key.createdAt) >= new Date(advancedFilters.createdDateFrom as string)
      )
    }

    if (typeof advancedFilters.createdDateTo === 'string' && advancedFilters.createdDateTo) {
      filtered = filtered.filter((key) =>
        new Date(key.createdAt) <= new Date(advancedFilters.createdDateTo as string)
      )
    }

    if (typeof advancedFilters.lastUsedDateFrom === 'string' && advancedFilters.lastUsedDateFrom) {
      filtered = filtered.filter((key) =>
        key.lastUsedAt && new Date(key.lastUsedAt) >= new Date(advancedFilters.lastUsedDateFrom as string)
      )
    }

    if (typeof advancedFilters.lastUsedDateTo === 'string' && advancedFilters.lastUsedDateTo) {
      filtered = filtered.filter((key) =>
        key.lastUsedAt && new Date(key.lastUsedAt) <= new Date(advancedFilters.lastUsedDateTo as string)
      )
    }

    setFilteredKeys(filtered)
  }, [searchQuery, keys, advancedFilters])

  const revokeApiKey = async (key: ApiKeyWithUser) => {
    setRevoking(key.id)
    try {
      const response = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to revoke API key")
      }

      const data = await response.json()
      toast.success(`Revoked API key "${data.revokedKey.name}"`)
      await fetchApiKeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke API key")
    } finally {
      setRevoking(null)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch {
      toast.error(`Failed to copy ${label}`)
    }
  }

  const handleViewDetails = (key: ApiKeyWithUser) => {
    setSelectedKey(key)
    setDetailsOpen(true)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const getStatusBadge = (key: ApiKeyWithUser) => {
    if (key.revokedAt) {
      return <Badge variant="destructive">Revoked</Badge>
    }
    if (isExpired(key.expiresAt)) {
      return <Badge variant="secondary">Expired</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">API Keys Management</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchApiKeys()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
              <KeyRound className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalKeys}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">API keys</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
              <Users className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.activeKeys}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Active keys</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Revoked</CardTitle>
              <ShieldOff className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.revokedKeys}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Revoked keys</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Expired</CardTitle>
              <Clock className="w-4 h-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.expiredKeys}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Expired keys</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Recently Used</CardTitle>
              <Activity className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.recentlyUsed}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search API keys..."
              value={localSearchQuery}
              onChange={(e) => {
                setLocalSearchQuery(e.target.value)
                setAdvancedFilters(prev => ({ ...prev, query: e.target.value }))
              }}
              className="pl-10"
            />
          </div>
          <Filters
            fields={filterFields}
            values={advancedFilters}
            onChange={setAdvancedFilters}
            onReset={() => {
              setAdvancedFilters({
                query: "",
                status: "all",
                scope: "all",
                userFilter: "all",
                createdDateFrom: undefined,
                createdDateTo: undefined,
                lastUsedDateFrom: undefined,
                lastUsedDateTo: undefined,
                expirationStatus: "all"
              })
              setLocalSearchQuery("")
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage all API keys across user accounts. You can revoke keys but cannot view the actual key values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredKeys.length === 0 ? (
              <div className="text-center py-8">
                <KeyRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {(searchQuery || localSearchQuery ||
                    Object.values(advancedFilters).some(v => v && v !== "" && v !== "all")) 
                    ? "No API keys found matching your search criteria" 
                    : "No API keys created yet"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Key Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Key Prefix</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Scopes</TableHead>
                        <TableHead className="hidden md:table-cell">Last Used</TableHead>
                        <TableHead className="hidden sm:table-cell">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{key.userName}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">{key.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {key.name}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{key.keyPrefix}...</code>
                          </TableCell>
                          <TableCell>{getStatusBadge(key)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {key.scopes.map((scope) => (
                                <Badge key={scope} variant="outline" className="text-xs">
                                  {scope}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {key.lastUsedAt ? (
                              <div className="space-y-1">
                                <div className="text-sm">
                                  {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                                </div>
                                {key.lastUsedIp && (
                                  <div className="text-xs text-muted-foreground">
                                    IP: {key.lastUsedIp}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={revoking === key.id}
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(key)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => copyToClipboard(key.id, "Key ID")}
                                  className="cursor-pointer"
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Key ID
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => copyToClipboard(key.keyPrefix, "Key Prefix")}
                                  className="cursor-pointer"
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Key Prefix
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!key.revokedAt && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to revoke the API key "${key.name}"? This action cannot be undone.`)) {
                                        revokeApiKey(key)
                                      }
                                    }}
                                    className="cursor-pointer text-destructive"
                                    disabled={revoking === key.id}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Revoke Key
                                  </DropdownMenuItem>
                                )}
                                {key.revokedAt && (
                                  <DropdownMenuItem disabled>
                                    <ShieldOff className="mr-2 h-4 w-4" />
                                    Already Revoked
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ApiKeyDetailsDialog
          apiKey={selectedKey}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onRevoke={revokeApiKey}
        />

        <CreateApiKeyDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onKeyCreated={fetchApiKeys}
          users={users}
        />
      </div>
    </div>
  )
}