"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Save, Settings } from "lucide-react"

const scheduleSettingsSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().min(1, "Interval must be at least 1 hour").max(168, "Interval cannot exceed 1 week"),
  batchSize: z.number().min(1, "Batch size must be at least 1").max(100, "Batch size cannot exceed 100"),
})

type ScheduleSettingsForm = z.infer<typeof scheduleSettingsSchema>

interface ReleaseScheduleData {
  id: number
  enabled: boolean
  intervalHours: number
  batchSize: number
  nextRunAt: string
  lastRunAt?: string
}

interface GlobalScheduleSettingsProps {
  schedule: ReleaseScheduleData | null | undefined
  onUpdate: (updates: Partial<ReleaseScheduleData>) => Promise<ReleaseScheduleData>
}

export function GlobalScheduleSettings({ schedule, onUpdate }: GlobalScheduleSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ScheduleSettingsForm>({
    resolver: zodResolver(scheduleSettingsSchema),
    values: schedule ? {
      enabled: schedule.enabled,
      intervalHours: schedule.intervalHours,
      batchSize: schedule.batchSize,
    } : {
      enabled: true,
      intervalHours: 1,
      batchSize: 10,
    }
  })

  const enabled = watch("enabled")

  const onSubmit = async (data: ScheduleSettingsForm) => {
    setIsLoading(true)
    try {
      await onUpdate(data)
      toast.success('Schedule settings updated successfully')
    } catch {
      toast.error('Failed to update schedule settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Global Schedule Settings
        </CardTitle>
        <CardDescription>
          Configure the global settings for automated GitHub release syncing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="enabled" className="text-base font-medium">
                Enable Automatic Syncing
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, the system will automatically check for new releases on the configured schedule.
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={(checked) => setValue("enabled", checked)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="intervalHours">Sync Interval (hours)</Label>
            <Input
              id="intervalHours"
              type="number"
              min="1"
              max="168"
              {...register("intervalHours", { valueAsNumber: true })}
              className="max-w-xs"
            />
            {errors.intervalHours && (
              <p className="text-sm text-red-600">{errors.intervalHours.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              How often to check for new releases (1-168 hours).
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max="100"
              {...register("batchSize", { valueAsNumber: true })}
              className="max-w-xs"
            />
            {errors.batchSize && (
              <p className="text-sm text-red-600">{errors.batchSize.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Number of modules to process in each sync batch (1-100).
            </p>
          </div>

          {schedule && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">Schedule Information</h4>
              <div className="grid gap-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Status:</span>
                  <span className={schedule.enabled ? "text-green-600" : "text-gray-500"}>
                    {schedule.enabled ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Next Run:</span>
                  <span>{new Date(schedule.nextRunAt).toLocaleString()}</span>
                </div>
                {schedule.lastRunAt && (
                  <div className="flex justify-between">
                    <span>Last Run:</span>
                    <span>{new Date(schedule.lastRunAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}