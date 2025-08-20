import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { CategoryPageClient } from "@/components/pages/category-page-client"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import { CategoryStructuredData } from "@/components/shared/structured-data"

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const categorySlug = resolvedParams.slug

  const category = MODULE_CATEGORIES.find(cat => cat.id === categorySlug)

  if (!category) {
    return {
      title: "Category Not Found",
      description: "The requested category could not be found.",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
  const categoryUrl = `${baseUrl}/category/${categorySlug}`

  return {
    title: `${category.label} Modules`,
    description: `Discover and download the best ${category.label.toLowerCase()} modules for Magisk and KernelSU. Enhance your Android device with trusted and tested modules.`,
    keywords: [
      category.label.toLowerCase(),
      'magisk modules',
      'kernelsu modules',
      'android root',
      'android customization',
      `${category.label.toLowerCase()} modules`,
    ],
    alternates: {
      canonical: categoryUrl,
    },
    openGraph: {
      title: `${category.label} Modules | modules`,
      description: `Browse ${category.label.toLowerCase()} modules for Magisk and KernelSU. Safe, verified modules for Android customization.`,
      url: categoryUrl,
      siteName: 'modules',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.label} Modules | modules`,
      description: `Browse ${category.label.toLowerCase()} modules for Magisk and KernelSU.`,
    },
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params
  const categorySlug = resolvedParams.slug

  const category = MODULE_CATEGORIES.find(cat => cat.id === categorySlug)

  if (!category) {
    notFound()
  }

  return (
    <>
      <CategoryStructuredData category={category} />
      <CategoryPageClient category={categorySlug} categoryTitle={category.label} />
    </>
  )
}