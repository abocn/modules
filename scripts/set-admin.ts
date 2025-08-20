import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function setAdmin(email: string) {
  console.log(`Setting admin role for user with email: ${email}`)

  if (!email) {
    console.error('❌ Email is required')
    process.exit(1)
  }

  try {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    })

    if (!existingUser) {
      console.error(`❌ User with email "${email}" not found`)
      console.log('Available users:')
      const allUsers = await db.query.user.findMany({
        columns: {
          email: true,
          name: true,
          role: true,
        }
      })
      allUsers.forEach(u => console.log(`  - ${u.email} (${u.name}) - ${u.role}`))
      process.exit(1)
    }

    if (existingUser.role === 'admin') {
      console.log(`✓ User "${email}" is already an admin`)
      return
    }

    await db
      .update(user)
      .set({
        role: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(user.email, email))

    console.log(`✅ Successfully set admin role for user: ${email}`)
    console.log(`   Name: ${existingUser.name}`)
    console.log(`   Previous role: ${existingUser.role}`)
    console.log(`   New role: admin`)

  } catch (error) {
    console.error('❌ Failed to set admin role:', error)
    throw error
  }
}

async function removeAdmin(email: string) {
  console.log(`Removing admin role for user with email: ${email}`)

  if (!email) {
    console.error('❌ Email is required')
    process.exit(1)
  }

  try {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    })

    if (!existingUser) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    if (existingUser.role !== 'admin') {
      console.log(`✓ User "${email}" is not an admin (current role: ${existingUser.role})`)
      return
    }

    await db
      .update(user)
      .set({
        role: 'user',
        updatedAt: new Date(),
      })
      .where(eq(user.email, email))

    console.log(`✅ Successfully removed admin role for user: ${email}`)
    console.log(`   Name: ${existingUser.name}`)
    console.log(`   Previous role: admin`)
    console.log(`   New role: user`)

  } catch (error) {
    console.error('❌ Failed to remove admin role:', error)
    throw error
  }
}

async function listAdmins() {
  console.log('📋 Current admin users:')

  try {
    const adminUsers = await db.query.user.findMany({
      where: eq(user.role, 'admin'),
      columns: {
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (adminUsers.length === 0) {
      console.log('   No admin users found')
      return
    }

    adminUsers.forEach(u => {
      console.log(`   ✓ ${u.email} (${u.name})`)
      console.log(`     Created: ${u.createdAt.toISOString()}`)
      console.log(`     Updated: ${u.updatedAt.toISOString()}`)
    })

    console.log(`\nTotal admin users: ${adminUsers.length}`)

  } catch (error) {
    console.error('❌ Failed to list admins:', error)
    throw error
  }
}

function parseArgs() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Usage:
  bun run scripts/set-admin.ts <command> [email]

Commands:
  set <email>     - Set user as admin by email
  remove <email>  - Remove admin role from user by email
  list            - List all current admin users

Examples:
  bun run scripts/set-admin.ts set user@example.com
  bun run scripts/set-admin.ts remove user@example.com
  bun run scripts/set-admin.ts list
    `)
    process.exit(1)
  }

  const command = args[0]
  const email = args[1]

  return { command, email }
}

if (require.main === module) {
  const { command, email } = parseArgs()

  let operation: Promise<void>

  switch (command) {
    case 'set':
      if (!email) {
        console.error('❌ Email is required for set command')
        process.exit(1)
      }
      operation = setAdmin(email)
      break
    case 'remove':
      if (!email) {
        console.error('❌ Email is required for remove command')
        process.exit(1)
      }
      operation = removeAdmin(email)
      break
    case 'list':
      operation = listAdmins()
      break
    default:
      console.error(`❌ Unknown command: ${command}`)
      console.error('Valid commands: set, remove, list')
      process.exit(1)
  }

  operation
    .then(() => {
      console.log('\n🎉 Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error)
      process.exit(1)
    })
}

export { setAdmin, removeAdmin, listAdmins }