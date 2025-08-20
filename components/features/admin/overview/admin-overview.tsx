"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAdminStats, usePendingModules, useRecentActions } from "@/hooks/use-admin"
import { Package, Users, AlertTriangle, TrendingUp, Download, Star, FileCheck, MessageSquare } from "lucide-react"

export function AdminOverview() {
  const { stats, isLoading: statsLoading } = useAdminStats()
  const { pendingModules: pendingModulesList, isLoading: pendingLoading } = usePendingModules(4)
  const { recentActions, isLoading: actionsLoading } = useRecentActions(5)

  const statsData = [
    {
      title: "Modules",
      value: stats?.totalModules?.toLocaleString() || "0",
      change: "+12%",
      icon: Package,
      color: "text-blue-400",
    },
    {
      title: "Users",
      value: stats?.totalUsers?.toLocaleString() || "0",
      change: "+8%",
      icon: Users,
      color: "text-green-400",
    },
    {
      title: "Downloads",
      value: stats?.totalDownloads?.toLocaleString() || "0",
      change: "+23%",
      icon: Download,
      color: "text-purple-400",
    },
    {
      title: "Pending",
      value: stats?.pendingModules?.toString() || "0",
      change: "-5%",
      icon: AlertTriangle,
      color: "text-yellow-400",
    },
    {
      title: "Declined",
      value: stats?.declinedModules?.toString() || "0",
      change: "+2%",
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ]

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }
  }

  const quickActions = [
    { title: "Add New Module", icon: Package, action: "admin-modules" },
    { title: "Manage Users", icon: Users, action: "admin-users" },
    { title: "Review Management", icon: MessageSquare, action: "admin-reviews" },
    { title: "Module Submissions", icon: FileCheck, action: "admin-module-submissions" },
  ]

  const getActivityIcon = (action: string) => {
    if (action.includes("Approved") || action.includes("approved")) {
      return <FileCheck className="text-green-400" />
    }
    if (action.includes("Rejected") || action.includes("rejected") || action.includes("declined")) {
      return <AlertTriangle className="text-red-400" />
    }
    if (action.includes("Featured") || action.includes("featured")) {
      return <Star className="text-yellow-400" />
    }
    if (action.includes("User") || action.includes("user")) {
      return <Users className="text-purple-400" />
    }
    if (action.includes("Module") || action.includes("module")) {
      return <Package className="text-blue-400" />
    }
    if (action.includes("Warning") || action.includes("warning")) {
      return <AlertTriangle className="text-yellow-400" />
    }
    return <Package className="text-gray-400" />
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">modules Administration</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {statsData.map((stat) => (
            <Card key={stat.title} className={stat.title === "Declined" ? "col-span-2 sm:col-span-1" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {statsLoading ? "..." : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-yellow-400" />
                Pending Modules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingLoading ? (
                 <div className="flex items-center justify-center py-8 text-muted-foreground">
                   <p>Loading pending modules...</p>
                 </div>
               ) : pendingModulesList?.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                   <FileCheck className="w-8 h-8 mb-2 opacity-50" />
                   <p>No modules pending review</p>
                 </div>
              ) : (
                pendingModulesList?.map((module, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => window.location.href = '/admin/module-submissions'}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{module.name}</div>
                      <div className="text-sm text-muted-foreground">by {module.author}</div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Badge variant="outline">Pending</Badge>
                     </div>
                  </div>
                ))
              )}
              {pendingModulesList?.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = '/admin/module-submissions'}
                >
                  View All Pending Modules
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 h-full">
               {quickActions.map((action, index) => (
                 <Button
                   key={index}
                   variant="outline"
                   className="h-full min-h-20 flex flex-col gap-2 bg-transparent"
                   onClick={() => window.location.href = `/admin/${action.action.replace('admin-', '')}`}
                 >
                   <action.icon className="w-6 h-6" />
                   <span className="text-sm">{action.title}</span>
                 </Button>
               ))}
             </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actionsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p>Loading recent actions...</p>
                </div>
              ) : recentActions?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                recentActions?.map((action, index) => (
                   <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                     {getActivityIcon(action.action)}
                     <div className="flex-1">
                       <div className="font-medium">{action.action}</div>
                       <div className="text-sm text-muted-foreground">{action.details}</div>
                       {action.adminName && (
                         <div className="text-xs text-muted-foreground">by {action.adminName}</div>
                       )}
                     </div>
                     <div className="text-sm text-muted-foreground">
                       {formatTimeAgo(action.createdAt)}
                     </div>
                   </div>
                 ))
              )}
            </div>
            {recentActions && recentActions.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = '/admin/audit'}
                >
                  View Full Audit Log
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
