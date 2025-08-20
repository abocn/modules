"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Settings, Calendar, Play, Pause, RefreshCw } from "lucide-react"
import { GlobalScheduleSettings } from "./global-schedule-settings"
import { ModuleSyncManagement } from "./module-sync-management"
import { SyncStatusMonitor } from "./sync-status-monitor"
import { useReleaseSchedule } from "@/hooks/use-release-schedule"

export function AdminReleaseSchedule() {
  const { schedule, isLoading, updateSchedule, runManualSync, refetch } = useReleaseSchedule()
  const [isManualRunning, setIsManualRunning] = useState(false)

  const toggleSchedule = async () => {
    if (!schedule) return

    try {
      await updateSchedule({ enabled: !schedule.enabled })
      toast.success(`Release schedule ${schedule.enabled ? 'disabled' : 'enabled'}`)
    } catch {
      toast.error('Failed to update schedule')
    }
  }

  const handleManualSync = async () => {
    setIsManualRunning(true)
    try {
      const result = await runManualSync()
      toast.success(`Manual sync started successfully! Job ID: ${result.job?.id || 'Unknown'}`, {
        description: 'Check the Jobs page to monitor progress'
      })
      refetch()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start manual sync'
      toast.error('Failed to start manual sync', {
        description: errorMessage
      })
    } finally {
      setIsManualRunning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] overflow-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Release Schedule Management
          </h1>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {schedule && (
              <Badge variant={schedule.enabled ? "default" : "secondary"}>
                {schedule.enabled ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={toggleSchedule}
                variant={schedule?.enabled ? "destructive" : "default"}
                className="flex items-center gap-2 text-sm md:text-base"
                size="sm"
              >
                {schedule?.enabled ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Disable Schedule
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Enable Schedule
                  </>
                )}
              </Button>

              <Button
                onClick={handleManualSync}
                disabled={isManualRunning}
                variant="outline"
                className="flex items-center gap-2 text-sm md:text-base"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${isManualRunning ? 'animate-spin' : ''}`} />
                {isManualRunning ? 'Running...' : 'Manual Sync'}
              </Button>
            </div>

            {schedule && (
              <div className="mt-4 p-3 md:p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-sm">
                  <div>
                    <p className="font-medium">Status</p>
                    <p className={schedule.enabled ? "text-green-600" : "text-gray-500"}>
                      {schedule.enabled ? "Running" : "Stopped"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Interval</p>
                    <p>{schedule.intervalHours} hour{schedule.intervalHours !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="font-medium">Batch Size</p>
                    <p>{schedule.batchSize} modules</p>
                  </div>
                  <div>
                    <p className="font-medium">Next Run</p>
                    <p className="break-all">{new Date(schedule.nextRunAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">Global Settings</TabsTrigger>
            <TabsTrigger value="modules">Module Sync</TabsTrigger>
            <TabsTrigger value="status">Sync Status</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <GlobalScheduleSettings
              schedule={schedule}
              onUpdate={updateSchedule}
            />
          </TabsContent>

          <TabsContent value="modules">
            <ModuleSyncManagement />
          </TabsContent>

          <TabsContent value="status">
            <SyncStatusMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}