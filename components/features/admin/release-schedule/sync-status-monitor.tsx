"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BarChart, CheckCircle, XCircle, Clock, RefreshCw, TrendingUp, Activity } from "lucide-react"
import { useSyncStats } from "@/hooks/use-release-schedule"

export function SyncStatusMonitor() {
  const { stats, isLoading, refetch } = useSyncStats()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sync status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unable to load sync statistics.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const successRate = stats.totalModules > 0 
    ? Math.round((stats.successfulSyncs / (stats.successfulSyncs + stats.failedSyncs)) * 100) 
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Modules</p>
                <p className="text-2xl font-bold">{stats.totalModules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-2xl font-bold">{stats.enabledModules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Avg Sync Time</p>
                <p className="text-2xl font-bold">{stats.averageSyncTime}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Sync Performance
          </CardTitle>
          <CardDescription>
            Overall sync success rate and performance metrics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm text-muted-foreground">{successRate}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Successful Syncs
                </p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  {stats.successfulSyncs}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Failed Syncs
                </p>
                <p className="text-lg font-bold text-red-900 dark:text-red-100">
                  {stats.failedSyncs}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Status</CardTitle>
          <CardDescription>
            Current scheduling information and timing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {stats.lastRunTime && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Last Run:</span>
                <span>{new Date(stats.lastRunTime).toLocaleString()}</span>
              </div>
            )}
            {stats.nextRunTime && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Next Run:</span>
                <span>{new Date(stats.nextRunTime).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest sync attempts and their results.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No recent sync activity.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {activity.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{activity.moduleName}</p>
                      {activity.error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {activity.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={activity.status === 'success' ? 'default' : 'destructive'}>
                      {activity.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}