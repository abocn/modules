import type { Metadata } from "next"
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { modules } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { isUserAdmin } from '@/lib/admin-utils'
import { EditModulePageClient } from '@/components/pages/admin/edit-module-page-client'

interface EditModulePageProps {
  params: Promise<{ id: string }>
}

async function getModule(id: string) {
  try {
    const [module] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1)

    return module || null
  } catch (error) {
    console.error('Error fetching module:', error)
    return null
  }
}

export default async function EditModulePage({ params }: EditModulePageProps) {
  const resolvedParams = await params
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session?.user?.id) {
    redirect('/')
  }

  if (!(await isUserAdmin(session.user.id))) {
    redirect('/admin')
  }

  const moduleData = await getModule(resolvedParams.id)

  if (!moduleData) {
    notFound()
  }

  return <EditModulePageClient module={moduleData} />
}

export async function generateMetadata({ params }: EditModulePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const moduleData = await getModule(resolvedParams.id)

  return {
    title: moduleData ? `Edit ${moduleData.name}` : 'Edit Module',
    description: moduleData ? `Edit module: ${moduleData.name}` : 'Edit module',
    robots: {
      index: false,
      follow: false,
    },
  }
}