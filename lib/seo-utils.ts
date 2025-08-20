import type { Metadata } from 'next'

export interface SEOData {
  title: string
  description: string
  keywords?: string[]
  canonical?: string
  noindex?: boolean
  nofollow?: boolean
  ogImage?: string
  twitterImage?: string
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  canonical,
  noindex = false,
  nofollow = false,
  ogImage = '/og-image.png',
  twitterImage,
}: SEOData): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : undefined

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: canonicalUrl ? {
      canonical: canonicalUrl,
    } : undefined,
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
      },
    },
    openGraph: {
      title: `${title} | modules`,
      description,
      url: canonicalUrl,
      siteName: 'modules',
      locale: 'en_US',
      type: 'website',
      images: ogImage ? [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        }
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | modules`,
      description,
      images: twitterImage ? [twitterImage] : ogImage ? [ogImage] : undefined,
    },
  }
}

export function truncateDescription(text: string, maxLength: number = 155): string {
  if (text.length <= maxLength) return text

  return text.slice(0, maxLength - 3).trim() + '...'
}

export function generateModuleKeywords(module: {
  name: string
  author: string
  category: string
  features: string[]
  compatibility: {
    rootMethods: string[]
  }
}): string[] {
  return [
    module.name,
    module.author,
    'magisk module',
    'kernelsu module',
    'android root',
    'android customization',
    module.category,
    ...module.features.slice(0, 3),
    ...module.compatibility.rootMethods.map(method => method.toLowerCase()),
  ].filter(Boolean)
}