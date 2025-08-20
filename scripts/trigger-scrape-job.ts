#!/usr/bin/env bun

import { db } from '../db'
import { adminJobs, user } from '../db/schema'
import { jobExecutionService } from '../lib/job-execution-service'
import { eq } from 'drizzle-orm'

async function triggerScrapeJob() {
  console.log('=== Triggering GitHub Scrape Job ===\n')

  try {
    const [adminUser] = await db
      .select()
      .from(user)
      .where(eq(user.role, 'admin'))
      .limit(1)

    if (!adminUser) {
      console.log('❌ No admin user found in database')
      console.log('Please create an admin user first')
      return
    }

    console.log(`Using admin user: ${adminUser.name} (${adminUser.id})`)

    console.log('\nCreating scrape job...')
    const [job] = await db
      .insert(adminJobs)
      .values({
        type: 'scrape_releases',
        name: 'Test GitHub Scrape',
        description: 'Testing GitHub auto-fetch with audit logging',
        status: 'pending',
        progress: 0,
        startedBy: adminUser.id,
        parameters: {
          scope: 'all'
        },
        logs: []
      })
      .returning()

    console.log(`✅ Created job with ID: ${job.id}`)
    console.log(`   Type: ${job.type}`)
    console.log(`   Name: ${job.name}`)
    console.log(`   Status: ${job.status}`)

    console.log('\nExecuting job...')
    await jobExecutionService.executeJob(job.id)

    const [completedJob] = await db
      .select()
      .from(adminJobs)
      .where(eq(adminJobs.id, job.id))

    console.log(`\n✅ Job completed with status: ${completedJob.status}`)

    if (completedJob.results) {
      const results = completedJob.results as {
        success: boolean;
        processedCount?: number;
        errorCount?: number;
        errors?: string[];
        summary?: string;
      }
      console.log(`   Processed: ${results.processedCount} modules`)
      console.log(`   Errors: ${results.errorCount}`)
      console.log(`   Summary: ${results.summary}`)
    }

    console.log('\n=== Checking Audit Log ===')
    const { adminActions } = await import('../db/schema')
    const { desc, or, and } = await import('drizzle-orm')

    const recentActions = await db
      .select()
      .from(adminActions)
      .where(
        or(
          and(
            eq(adminActions.targetType, 'system'),
            eq(adminActions.targetId, `job-${job.id}`)
          ),
          and(
            eq(adminActions.targetType, 'module'),
            eq(adminActions.adminId, adminUser.id)
          )
        )
      )
      .orderBy(desc(adminActions.createdAt))
      .limit(10)

    if (recentActions.length > 0) {
      console.log(`✅ Found ${recentActions.length} audit log entries:`)
      for (const action of recentActions) {
        console.log(`\n   Action: ${action.action}`)
        console.log(`   Details: ${action.details}`)
        console.log(`   Target: ${action.targetType} (${action.targetId})`)
        console.log(`   Time: ${new Date(action.createdAt).toLocaleString()}`)
        if (action.newValues) {
          console.log(`   Data: ${JSON.stringify(action.newValues)}`)
        }
      }
    } else {
      console.log('❌ No audit log entries found for this job')
    }

    console.log('\n=== Job Execution Complete ===')

  } catch (error) {
    console.error('Failed to trigger scrape job:', error)
    process.exit(1)
  }
}

triggerScrapeJob()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })