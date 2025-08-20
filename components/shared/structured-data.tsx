interface ModuleStructuredDataProps {
  module: {
    id: string
    name: string
    slug: string
    description: string
    author: string
    version: string
    rating: number
    reviewCount: number
    downloads: number
    license: string
    category: string
    icon?: string
    lastUpdated: string
    isOpenSource: boolean
    size: string
    features: string[]
    compatibility: {
      androidVersions: string[]
      rootMethods: string[]
    }
  }
}

interface StructuredDataSchema {
  "@context": string
  "@type": string
  name: string
  description: string
  author: {
    "@type": string
    name: string
  }
  version: string
  applicationCategory: string
  operatingSystem: string
  downloadUrl: string
  url: string
  license: string
  offers: {
    "@type": string
    price: string
    priceCurrency: string
  }
  aggregateRating: {
    "@type": string
    ratingValue: number
    reviewCount: number
    bestRating: string
    worstRating: string
  }
  interactionStatistic: {
    "@type": string
    interactionType: string
    userInteractionCount: number
  }
  dateModified: string
  fileSize: string
  softwareRequirements: string[]
  featureList: string[]
  isAccessibleForFree: boolean
  copyrightHolder: {
    "@type": string
    name: string
  }
  image?: string
}

export function ModuleStructuredData({ module }: ModuleStructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

  const structuredData: StructuredDataSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": module.name,
    "description": module.description,
    "author": {
      "@type": "Person",
      "name": module.author
    },
    "version": module.version,
    "applicationCategory": "MobileApplication",
    "operatingSystem": `Android ${module.compatibility.androidVersions.join(', ')}`,
    "downloadUrl": `${baseUrl}/module/${module.slug}`,
    "url": `${baseUrl}/module/${module.slug}`,
    "license": module.license,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": module.rating,
      "reviewCount": module.reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    },
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/DownloadAction",
      "userInteractionCount": module.downloads
    },
    "dateModified": module.lastUpdated,
    "fileSize": module.size,
    "softwareRequirements": module.compatibility.rootMethods,
    "featureList": module.features,
    "isAccessibleForFree": true,
    "copyrightHolder": {
      "@type": "Person",
      "name": module.author
    }
  }

  if (module.icon) {
    structuredData.image = module.icon
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}

interface CategoryStructuredDataProps {
  category: {
    id: string
    label: string
  }
}

export function CategoryStructuredData({ category }: CategoryStructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category.label} Modules`,
    "description": `Collection of ${category.label.toLowerCase()} modules for Android root users`,
    "url": `${baseUrl}/category/${category.id}`,
    "mainEntity": {
      "@type": "ItemList",
      "name": `${category.label} Modules`,
      "description": `Browse and download ${category.label.toLowerCase()} modules for Magisk and KernelSU`
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": category.label,
          "item": `${baseUrl}/category/${category.id}`
        }
      ]
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}

export function WebsiteStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "modules",
    "alternateName": "modules.lol",
    "description": "Discover, download, and publish Magisk and KernelSU modules for your device. Experience true Android freedom!",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "modules.lol",
      "url": baseUrl
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  )
}