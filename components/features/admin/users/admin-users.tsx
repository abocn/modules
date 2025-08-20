"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserManagement } from "@/components/features/admin/users/user-management"
import { Filters, FilterField, FilterValues } from "@/components/features/admin/filters"
import { Search, Users, Shield } from "lucide-react"

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [userStats, setUserStats] = useState({
    total: 0,
    admins: 0,
  })
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues>({
    query: "",
    roleFilter: "all",
    providerFilter: "all",
    emailVerified: "all",
    joinDateFrom: undefined,
    joinDateTo: undefined,
    lastActiveFrom: undefined,
    lastActiveTo: undefined,
    minModules: 0,
    minReviews: 0
  })

  const filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'query',
      label: 'Search Users',
      placeholder: 'Search by name or email...'
    },
    {
      type: 'select',
      key: 'roleFilter',
      label: 'Role',
      options: [
        { value: 'user', label: 'User' },
        { value: 'admin', label: 'Admin' }
      ]
    },
    {
      type: 'select',
      key: 'providerFilter',
      label: 'Auth Provider',
      options: [
        { value: 'github', label: 'GitHub' },
        { value: 'google', label: 'Google' }
      ]
    },
    {
      type: 'select',
      key: 'emailVerified',
      label: 'Email Verified',
      options: [
        { value: 'true', label: 'Verified' },
        { value: 'false', label: 'Not Verified' }
      ]
    },
    {
      type: 'date',
      key: 'joinDateFrom',
      label: 'Join Date From'
    },
    {
      type: 'date',
      key: 'joinDateTo',
      label: 'Join Date To'
    },
    {
      type: 'date',
      key: 'lastActiveFrom',
      label: 'Last Active From'
    },
    {
      type: 'date',
      key: 'lastActiveTo',
      label: 'Last Active To'
    },
    {
      type: 'number',
      key: 'minModules',
      label: 'Minimum Modules Submitted',
      placeholder: '0',
      min: 0
    },
    {
      type: 'number',
      key: 'minReviews',
      label: 'Minimum Reviews Written',
      placeholder: '0',
      min: 0
    }
  ]

  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      query: "",
      roleFilter: "all",
      providerFilter: "all",
      emailVerified: "all",
      joinDateFrom: undefined,
      joinDateTo: undefined,
      lastActiveFrom: undefined,
      lastActiveTo: undefined,
      minModules: 0,
      minReviews: 0
    })
    setSearchQuery("")
    setRoleFilter("all")
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.admins}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setAdvancedFilters(prev => ({ ...prev, query: e.target.value }))
              }}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => {
            setRoleFilter(value)
            setAdvancedFilters(prev => ({ ...prev, roleFilter: value }))
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Filters
            fields={filterFields}
            values={advancedFilters}
            onChange={setAdvancedFilters}
            onReset={resetAdvancedFilters}
          />
        </div>

        <UserManagement advancedFilters={advancedFilters} onUserUpdated={fetchStats} />
      </div>
    </div>
  )
}
