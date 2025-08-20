"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JobHistory, JobHistoryRef } from "@/components/features/admin/jobs/job-history"
import { useJobStats, useJobActions } from "@/hooks/use-jobs"
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Users,
  Database,
  RefreshCw,
  Mail
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AdminJobs() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const jobHistoryRef = useRef<JobHistoryRef | null>(null)

  const { stats, isLoading: statsLoading, refetch: refetchStats } = useJobStats()
  const { startJob } = useJobActions()

  const handleStartJob = useCallback(async (type: string, name: string, parameters?: Record<string, unknown>) => {
    setIsLoading(true)
    try {
      await startJob(type, name, parameters)
      toast.success(`${name} job has been queued successfully.`)
      refetchStats()
      jobHistoryRef.current?.refetchJobs()
    } catch (error) {
      console.error('Error starting job:', error)
      toast.error("Failed to start job. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [startJob, refetchStats])

  const handleSendTestEmail = useCallback(async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error("Please enter a valid email address")
      return
    }

    setSendingTestEmail(true)
    try {
      const response = await fetch('/api/admin/jobs/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmailAddress }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      toast.success(`Test email sent successfully to ${testEmailAddress}`)
      setTestEmailOpen(false)
      setTestEmailAddress("")
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error(error instanceof Error ? error.message : "Failed to send test email")
    } finally {
      setSendingTestEmail(false)
    }
  }, [testEmailAddress])

  const quickJobs = [
    {
      id: "scrape_all_releases",
      name: "Scrape All Releases",
      description: "Scrape releases for all modules with GitHub repositories",
      type: "scrape_releases",
      icon: Download,
      parameters: { scope: "all" }
    },
    {
      id: "scrape_outdated_releases",
      name: "Scrape Outdated Releases",
      description: "Scrape releases for modules that haven't been updated in 24+ hours",
      type: "scrape_releases",
      icon: Clock,
      parameters: { scope: "outdated" }
    },
    {
      id: "sync_github_configs",
      name: "Sync GitHub Configs",
      description: "Ensure GitHub sync settings match published module status",
      type: "sync_github_configs",
      icon: Users,
      parameters: {}
    },
    {
      id: "generate_slugs",
      name: "Generate Module Slugs",
      description: "Generate SEO-friendly slugs for modules that don't have them",
      type: "generate_slugs",
      icon: RefreshCw,
      parameters: {}
    },
    {
      id: "cleanup_failed_jobs",
      name: "Cleanup Failed Jobs",
      description: "Remove old failed job records older than 30 days",
      type: "cleanup",
      icon: Database,
      parameters: { target: "failed_jobs", days: 30 }
    },
    {
      id: "test_email",
      name: "Test Email",
      description: "Send a test email to verify email configuration",
      type: "test_email",
      icon: Mail,
      parameters: {},
      isDialog: true
    }
  ]

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-auto">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Jobs</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats()
              jobHistoryRef.current?.refetchJobs()
            }}
            disabled={statsLoading}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Total Jobs</CardTitle>
              <Database className="md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.total.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
              <Clock className="md:h-4 md:w-4 text-yellow-500" />
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.pending || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Running</CardTitle>
              <Play className="md:h-4 md:w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.running || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="md:h-4 md:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.completed || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Failed</CardTitle>
              <XCircle className="md:h-4 md:w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.failed || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {quickJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-3 px-4">
                    <div className="flex items-start gap-2">
                      <job.icon className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <CardTitle className="text-sm md:text-base leading-tight">{job.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3 px-4">
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{job.description}</p>
                    <Button
                      onClick={() => {
                        if (job.isDialog) {
                          setTestEmailOpen(true)
                        } else {
                          handleStartJob(job.type, job.name, job.parameters)
                        }
                      }}
                      disabled={isLoading}
                      className="w-full text-xs md:text-sm"
                      size="sm"
                    >
                      <Play className="md:h-4 md:w-4 mr-1.5" />
                      {job.id === "test_email" ? "Send Test" : "Start Job"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle className="text-lg md:text-xl">Job History</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="scrape_releases">Scrape Releases</SelectItem>
                    <SelectItem value="sync_github_configs">Sync GitHub Configs</SelectItem>
                    <SelectItem value="generate_slugs">Generate Slugs</SelectItem>
                    <SelectItem value="cleanup">Cleanup</SelectItem>
                    <SelectItem value="test_email">Test Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <JobHistory
              ref={jobHistoryRef}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              onJobUpdate={refetchStats}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                disabled={sendingTestEmail}
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address where you want to receive the test email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTestEmailOpen(false)
                setTestEmailAddress("")
              }}
              disabled={sendingTestEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail || !testEmailAddress}
            >
              {sendingTestEmail ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}