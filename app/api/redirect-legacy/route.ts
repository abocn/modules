import { NextRequest, NextResponse } from 'next/server'
import { getModuleById } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const moduleId = searchParams.get('id')
  
  if (!moduleId) {
    return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
  }

  try {
    const moduleData = await getModuleById(moduleId)
    
    if (!moduleData) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
    const newUrl = `${baseUrl}/module/${moduleData.slug}`
    
    return NextResponse.redirect(newUrl, 301)
  } catch (error) {
    console.error('Error redirecting legacy URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}