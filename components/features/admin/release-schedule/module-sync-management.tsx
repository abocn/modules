"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import { SiGithub } from "react-icons/si"
import { useModuleSyncs } from "@/hooks/use-release-schedule"

export function ModuleSyncManagement() {
  const { modules, isLoading, toggleModuleSync, triggerModuleSync, refetch } = useModuleSyncs()
  const [searchQuery, setSearchQuery] = useState("")

  const handleToggleSync = async (moduleId: string, enabled: boolean) => {
    try {
      await toggleModuleSync(moduleId, enabled)
      toast.success(`Sync ${enabled ? 'enabled' : 'disabled'} for module`)
    } catch {
      toast.error('Failed to update module sync')
    }
  }

  const handleManualSync = async (moduleId: string) => {
    try {
      await triggerModuleSync(moduleId)
      toast.success('Manual sync started for module')
      refetch()
    } catch {
      toast.error('Failed to start manual sync')
    }
  }

  const filteredModules = modules.filter(module =>
    module.module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.module.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.githubRepo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading modules...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SiGithub className="h-5 w-5" />
          Module Sync Management
        </CardTitle>
        <CardDescription>
          Manage GitHub repository syncing for individual modules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules by name, author, or repository..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-3">
          {filteredModules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No modules found matching your search.' : 'No modules with GitHub sync configured.'}
              </p>
            </div>
          ) : (
            filteredModules.map((moduleSync) => (
              <div key={moduleSync.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{moduleSync.module.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      by {moduleSync.module.author}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={moduleSync.module.status === 'approved' ? 'default' : 'secondary'}>
                      {moduleSync.module.status}
                    </Badge>
                    <Switch
                      checked={moduleSync.enabled}
                      onCheckedChange={(enabled) => handleToggleSync(moduleSync.moduleId, enabled)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <SiGithub className="h-4 w-4" />
                  <a
                    href={`https://github.com/${moduleSync.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {moduleSync.githubRepo}
                    <ExternalLink />
                  </a>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {moduleSync.syncErrors.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span>
                      {moduleSync.syncErrors.length > 0
                        ? `${moduleSync.syncErrors.length} error(s)`
                        : 'Sync healthy'
                      }
                    </span>
                  </div>

                  {moduleSync.lastSyncAt && (
                    <div>
                      <span className="text-muted-foreground">Last sync: </span>
                      <span>{new Date(moduleSync.lastSyncAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {moduleSync.syncErrors.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Recent Sync Errors:
                    </p>
                    <div className="space-y-1">
                      {moduleSync.syncErrors.slice(0, 2).map((error, index) => (
                        <div key={index} className="text-xs text-red-700 dark:text-red-300">
                          <span className="font-mono">{error.error}</span>
                          <span className="ml-2 text-red-600 dark:text-red-400">
                            ({new Date(error.timestamp).toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManualSync(moduleSync.moduleId)}
                    disabled={!moduleSync.enabled}
                  >
                    Manual Sync
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}