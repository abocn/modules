"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Trash2 } from "lucide-react"
import { FaGithub, FaGoogle } from "react-icons/fa"
import { EditUserDialog } from "@/components/features/admin/users/edit-user-dialog"
import type { UserWithStats, UserAdvancedFilters } from "@/types/admin"

interface UserManagementProps {
  searchQuery?: string
  roleFilter?: string
  advancedFilters?: UserAdvancedFilters
  onUserUpdated?: () => void
}

export function UserManagement({ searchQuery = "", roleFilter = "all", advancedFilters, onUserUpdated }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (advancedFilters) {
        if (advancedFilters.query) params.append('query', advancedFilters.query)
        if (advancedFilters.roleFilter && advancedFilters.roleFilter !== 'all') params.append('role', advancedFilters.roleFilter)
        if (advancedFilters.providerFilter && advancedFilters.providerFilter !== 'all') params.append('provider', advancedFilters.providerFilter)
        if (advancedFilters.emailVerified && advancedFilters.emailVerified !== 'all') params.append('emailVerified', String(advancedFilters.emailVerified))
        if (advancedFilters.joinDateFrom) params.append('joinDateFrom', advancedFilters.joinDateFrom)
        if (advancedFilters.joinDateTo) params.append('joinDateTo', advancedFilters.joinDateTo)
        if (advancedFilters.lastActiveFrom) params.append('lastActiveFrom', advancedFilters.lastActiveFrom)
        if (advancedFilters.lastActiveTo) params.append('lastActiveTo', advancedFilters.lastActiveTo)
        if (advancedFilters.minModules && advancedFilters.minModules > 0) params.append('minModules', advancedFilters.minModules.toString())
        if (advancedFilters.minReviews && advancedFilters.minReviews > 0) params.append('minReviews', advancedFilters.minReviews.toString())
      } else {
        if (searchQuery) params.append('query', searchQuery)
        if (roleFilter !== 'all') params.append('role', roleFilter)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data.users)
      setError(null)
    } catch (err) {
      console.error('[!] Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter, advancedFilters])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers, refreshTrigger])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changeRole', role: newRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      setRefreshTrigger(prev => prev + 1)
      if (onUserUpdated) {
        onUserUpdated()
      }
    } catch (err) {
      console.error('[!] Error updating role:', err)
      alert(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleUserUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
    if (onUserUpdated) {
      onUserUpdated()
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingUserId(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      setRefreshTrigger(prev => prev + 1)
      if (onUserUpdated) {
        onUserUpdated()
      }
    } catch (err) {
      console.error('[!] Error deleting user:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getAuthProviderBadge = (provider?: string | undefined) => {
    if (!provider) {
      return <Badge variant="outline" className="text-xs">Unknown</Badge>
    }

    switch (provider.toLowerCase()) {
      case "github":
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <FaGithub className="w-3 h-3" />
            GitHub
          </Badge>
        )
      case "google":
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <FaGoogle className="w-3 h-3" />
            Google
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {provider}
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading users...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Auth Type</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Contributions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-muted text-xs">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.name}
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{getAuthProviderBadge(user.provider)}</TableCell>
                <TableCell>{user.joinDate}</TableCell>
                <TableCell>{user.lastActive}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{user.modulesSubmitted} modules</div>
                    <div className="text-muted-foreground">{user.reviewsWritten} reviews</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <EditUserDialog
                      user={user}
                      onUserUpdated={handleUserUpdated}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      disabled={deletingUserId === user.id}
                    >
                      {deletingUserId === user.id ? (
                        <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}