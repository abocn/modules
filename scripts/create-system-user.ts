#!/usr/bin/env bun

import { db } from '../db'
import { user } from '../db/schema'
import { eq } from 'drizzle-orm'

async function createSystemUser() {
  console.log('=== Creating System User ===\n')

  try {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, 'SYSTEM'))
      .limit(1)

    if (existingUser) {
      console.log('✅ System user already exists')
      return
    }

    await db.insert(user).values({
      id: 'SYSTEM',
      name: 'System',
      email: 'system@modules.local',
      emailVerified: true,
      role: 'admin',
      image: null,
    })

    console.log('✅ System user created successfully')
    console.log('   ID: SYSTEM')
    console.log('   Name: System')
    console.log('   Email: system@modules.local')
    console.log('   Role: admin')

  } catch (error) {
    console.error('Failed to create system user:', error)
    process.exit(1)
  }
}

createSystemUser()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })