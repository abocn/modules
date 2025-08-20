"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ModuleCard } from "@/components/features/modules/module-card"
import { useModules } from "@/hooks/use-modules"
import type { Module } from "@/types/module"
import { Search, Filter, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"
import { MODULE_CATEGORIES } from "@/lib/constants/categories"
import { getLicenseOptionsWithAll } from "@/lib/utils/license-utils"
import { AdvancedSearchSkeleton } from "./skeletons/advanced-search-skeleton"

interface AdvancedSearchProps {
  onModuleSelect: (module: Module) => void
}

interface SearchFilters {
  query: string
  categories: string[]
  rootMethods: string[]
  androidVersions: string[]
  isOpenSource: boolean | null
  minRating: number
  maxSize: number
  hasWarnings: boolean | null
  isFeatured: boolean | null
  isRecommended: boolean | null
  isPublished: boolean | null
  status: string | null
  license: string | null
  hasSourceUrl: boolean | null
  hasCommunityUrl: boolean | null
  sortBy: string
  sortOrder: "asc" | "desc"
}

export function AdvancedSearch({ onModuleSelect }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    categories: [],
    rootMethods: [],
    androidVersions: [],
    isOpenSource: null,
    minRating: 0,
    maxSize: 100,
    hasWarnings: null,
    isFeatured: null,
    isRecommended: null,
    isPublished: null,
    status: null,
    license: null,
    hasSourceUrl: null,
    hasCommunityUrl: null,
    sortBy: "downloads",
    sortOrder: "desc",
  })

  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    rootMethods: true,
    androidVersions: false,
    preferences: false,
    status: false,
    additional: false
  })
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [localQuery, setLocalQuery] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const categories = useMemo(() => MODULE_CATEGORIES.map(cat => cat.id), [])
  const rootMethods = useMemo(() => ["Magisk", "KernelSU", "KernelSU-Next"], [])
  const androidVersions = useMemo(() => ["4.1+", "5.0+", "6.0+", "7.0+", "8.0+", "9.0+", "10+", "11+", "12+", "13+", "14+", "15+", "16+"], [])

  const licenseOptionsWithAll = getLicenseOptionsWithAll()

  const statusOptions = [
    { value: "pending", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "declined", label: "Declined" },
  ]

  const { modules: allModules, loading, error } = useModules()

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setShowFilters(false)
    }
  }, [isMobile])

  useEffect(() => {
    setLocalQuery(filters.query)
  }, [filters.query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFilters && isMobile) {
        setShowFilters(false)
      }
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowFilters(true)
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFilters, isMobile])

  const getFilteredModules = useCallback(() => {
    let filtered = allModules

    // Text search
    if (filters.query) {
      filtered = filtered.filter(
        (module) =>
          module.name.toLowerCase().includes(filters.query.toLowerCase()) ||
          module.description.toLowerCase().includes(filters.query.toLowerCase()) ||
          module.author.toLowerCase().includes(filters.query.toLowerCase()) ||
          module.features.some((feature) => feature.toLowerCase().includes(filters.query.toLowerCase())),
      )
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter((module) => filters.categories.includes(module.category))
    }

    // Root method filter
    if (filters.rootMethods.length > 0) {
      filtered = filtered.filter((module) =>
        filters.rootMethods.some((method) => module.compatibility.rootMethods.includes(method as "Magisk" | "KernelSU" | "KernelSU-Next")),
      )
    }

    // Android version filter
    if (filters.androidVersions.length > 0) {
      filtered = filtered.filter((module) =>
        filters.androidVersions.some((version) => module.compatibility.androidVersions.includes(version)),
      )
    }

    // Open source filter
    if (filters.isOpenSource !== null) {
      filtered = filtered.filter((module) => module.isOpenSource === filters.isOpenSource)
    }

    // Rating filter
    filtered = filtered.filter((module) => module.rating >= filters.minRating)

    // Size filter (convert MB to number for comparison)
    filtered = filtered.filter((module) => {
      const sizeInMB = Number.parseFloat(module.size.replace(" MB", ""))
      return sizeInMB <= filters.maxSize
    })

    // Warnings filter
    if (filters.hasWarnings !== null) {
      filtered = filtered.filter((module) =>
        filters.hasWarnings ? module.warnings.length > 0 : module.warnings.length === 0,
      )
    }

    // Featured filter
    if (filters.isFeatured !== null) {
      filtered = filtered.filter((module) => module.isFeatured === filters.isFeatured)
    }

    // Recommended filter
    if (filters.isRecommended !== null) {
      filtered = filtered.filter((module) => module.isRecommended === filters.isRecommended)
    }

    // Published filter
    if (filters.isPublished !== null) {
      filtered = filtered.filter((module) => module.isPublished === filters.isPublished)
    }

    // Status filter
    if (filters.status !== null) {
      filtered = filtered.filter((module) => module.status === filters.status)
    }

    // License filter
    if (filters.license !== null) {
      filtered = filtered.filter((module) => module.license === filters.license)
    }

    // Source URL filter
    if (filters.hasSourceUrl !== null) {
      filtered = filtered.filter((module) =>
        filters.hasSourceUrl ? module.sourceUrl && module.sourceUrl.length > 0 : !module.sourceUrl || module.sourceUrl.length === 0,
      )
    }

    // Community URL filter
    if (filters.hasCommunityUrl !== null) {
      filtered = filtered.filter((module) =>
        filters.hasCommunityUrl ? module.communityUrl && module.communityUrl.length > 0 : !module.communityUrl || module.communityUrl.length === 0,
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date

      switch (filters.sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "rating":
          aValue = a.rating
          bValue = b.rating
          break
        case "downloads":
          aValue = a.downloads
          bValue = b.downloads
          break
        case "lastUpdated":
          aValue = new Date(a.lastUpdated)
          bValue = new Date(b.lastUpdated)
          break
        default:
          return 0
      }

      if (filters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [allModules, filters])

  const clearFilters = useCallback(() => {
    setFilters({
      query: "",
      categories: [],
      rootMethods: [],
      androidVersions: [],
      isOpenSource: null,
      minRating: 0,
      maxSize: 100,
      hasWarnings: null,
      isFeatured: null,
      isRecommended: null,
      isPublished: null,
      status: null,
      license: null,
      hasSourceUrl: null,
      hasCommunityUrl: null,
      sortBy: "downloads",
      sortOrder: "desc",
    })
  }, [])

  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, query }))
    }, 300)
    setSearchTimeout(timeout)
  }, [searchTimeout])

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const FilterSection = ({ title, section, children }: { title: string; section: string; children: React.ReactNode }) => {
    const isExpanded = expandedSections[section]
    return (
      <div className="space-y-3">
        <button
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between w-full text-left"
          type="button"
        >
          <Label className="font-medium">{title}</Label>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && children}
      </div>
    )
  }

  const filteredModules = useMemo(() => getFilteredModules(), [getFilteredModules])
  const paginatedModules = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredModules.slice(startIndex, endIndex)
  }, [filteredModules, currentPage, pageSize])

  const totalPages = Math.ceil(filteredModules.length / pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, pageSize])
  const activeFiltersCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.rootMethods.length > 0 ? 1 : 0) +
    (filters.androidVersions.length > 0 ? 1 : 0) +
    (filters.isOpenSource !== null ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.maxSize < 100 ? 1 : 0) +
    (filters.hasWarnings !== null ? 1 : 0) +
    (filters.isFeatured !== null ? 1 : 0) +
    (filters.isRecommended !== null ? 1 : 0) +
    (filters.isPublished !== null ? 1 : 0) +
    (filters.status !== null ? 1 : 0) +
    (filters.license !== null ? 1 : 0) +
    (filters.hasSourceUrl !== null ? 1 : 0) +
    (filters.hasCommunityUrl !== null ? 1 : 0)

  if (loading) {
    return <AdvancedSearchSkeleton />
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex relative">
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
        showFilters && isMobile ? "opacity-100" : "opacity-0 pointer-events-none"
      }`} onClick={() => setShowFilters(false)} />

      <div className={`${
        isMobile
          ? `fixed inset-y-0 left-0 w-80 bg-background border-r z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
              showFilters ? "translate-x-0" : "-translate-x-full"
            }`
          : `transition-all duration-300 ease-in-out ${
              showFilters
                ? "w-80 border-r bg-muted/30 opacity-100"
                : "w-0 border-r-0 opacity-0 overflow-hidden"
            }`
      }`}>
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className={`${isMobile ? "h-[calc(100vh-4rem)]" : "h-[calc(100vh-3.5rem)]"} overflow-auto`}>
            <div className="p-4 space-y-6">
              {!isMobile && (
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount}</Badge>}
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </div>
                </div>
              )}

              <FilterSection title="Categories" section="categories">
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id={category}
                        checked={filters.categories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters((prev) => ({
                              ...prev,
                              categories: [...prev.categories, category],
                            }))
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              categories: prev.categories.filter((c) => c !== category),
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={category} className="text-sm cursor-pointer flex-1">
                        {MODULE_CATEGORIES.find(cat => cat.id === category)?.shortLabel || category}
                      </Label>
                    </div>
                  ))}
                </div>
              </FilterSection>

              <Separator />

              <FilterSection title="Root Methods" section="rootMethods">
                <div className="space-y-2">
                  {rootMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id={method}
                        checked={filters.rootMethods.includes(method)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters((prev) => ({
                              ...prev,
                              rootMethods: [...prev.rootMethods, method],
                            }))
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              rootMethods: prev.rootMethods.filter((m) => m !== method),
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={method} className="text-sm cursor-pointer flex-1">
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </FilterSection>

              <Separator />

              <FilterSection title="Android Versions" section="androidVersions">
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {androidVersions.map((version) => (
                    <div key={version} className="flex items-center space-x-2 min-h-[2.25rem] px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id={version}
                        checked={filters.androidVersions.includes(version)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters((prev) => ({
                              ...prev,
                              androidVersions: [...prev.androidVersions, version],
                            }))
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              androidVersions: prev.androidVersions.filter((v) => v !== version),
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={version} className="text-xs cursor-pointer flex-1">
                        {version}
                      </Label>
                    </div>
                  ))}
                </div>
              </FilterSection>

              <Separator />

              <FilterSection title="Preferences" section="preferences">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Source Code</Label>
                    <Select
                      value={filters.isOpenSource === null ? "all" : filters.isOpenSource.toString()}
                      onValueChange={(value) => {
                        setFilters((prev) => ({
                          ...prev,
                          isOpenSource: value === "all" ? null : value === "true",
                        }))
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Open Source Only</SelectItem>
                        <SelectItem value="false">Closed Source Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Minimum Rating: {filters.minRating.toFixed(1)}</Label>
                    <Slider
                      value={[filters.minRating]}
                      onValueChange={([value]) => setFilters((prev) => ({ ...prev, minRating: value }))}
                      max={5}
                      min={0}
                      step={0.1}
                      className="w-full touch-pan-x"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Maximum Size: {filters.maxSize} MB</Label>
                    <Slider
                      value={[filters.maxSize]}
                      onValueChange={([value]) => setFilters((prev) => ({ ...prev, maxSize: value }))}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full touch-pan-x"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Security Warnings</Label>
                    <Select
                      value={filters.hasWarnings === null ? "all" : filters.hasWarnings.toString()}
                      onValueChange={(value) => {
                        setFilters((prev) => ({
                          ...prev,
                          hasWarnings: value === "all" ? null : value === "true",
                        }))
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        <SelectItem value="false">Safe Only</SelectItem>
                        <SelectItem value="true">With Warnings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FilterSection>

              <Separator />

              <FilterSection title="Module Status" section="status">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id="featured"
                        checked={filters.isFeatured === true}
                        onCheckedChange={(checked) => {
                          setFilters((prev) => ({
                            ...prev,
                            isFeatured: checked ? true : null,
                          }))
                        }}
                      />
                      <Label htmlFor="featured" className="text-sm cursor-pointer flex-1">
                        Featured Only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id="recommended"
                        checked={filters.isRecommended === true}
                        onCheckedChange={(checked) => {
                          setFilters((prev) => ({
                            ...prev,
                            isRecommended: checked ? true : null,
                          }))
                        }}
                      />
                      <Label htmlFor="recommended" className="text-sm cursor-pointer flex-1">
                        Recommended Only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id="published"
                        checked={filters.isPublished === true}
                        onCheckedChange={(checked) => {
                          setFilters((prev) => ({
                            ...prev,
                            isPublished: checked ? true : null,
                          }))
                        }}
                      />
                      <Label htmlFor="published" className="text-sm cursor-pointer flex-1">
                        Published Only
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Review Status</Label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => {
                        setFilters((prev) => ({
                          ...prev,
                          status: value === "all" ? null : value,
                        }))
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">License</Label>
                    <Combobox
                      options={licenseOptionsWithAll}
                      value={filters.license || "all"}
                      onValueChange={(value) => {
                        setFilters((prev) => ({
                          ...prev,
                          license: value === "all" ? null : value,
                        }))
                      }}
                      placeholder="Select license"
                      searchPlaceholder="Search licenses..."
                      emptyText="No license found."
                    />
                  </div>
                </div>
              </FilterSection>

              <Separator />

              <FilterSection title="Additional Features" section="additional">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id="hasSource"
                      checked={filters.hasSourceUrl === true}
                      onCheckedChange={(checked) => {
                        setFilters((prev) => ({
                          ...prev,
                          hasSourceUrl: checked ? true : null,
                        }))
                      }}
                    />
                    <Label htmlFor="hasSource" className="text-sm cursor-pointer flex-1">
                      Has Source Code
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 min-h-[2.5rem] px-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id="hasCommunity"
                      checked={filters.hasCommunityUrl === true}
                      onCheckedChange={(checked) => {
                        setFilters((prev) => ({
                          ...prev,
                          hasCommunityUrl: checked ? true : null,
                        }))
                      }}
                    />
                    <Label htmlFor="hasCommunity" className="text-sm cursor-pointer flex-1">
                      Has Community Link
                    </Label>
                  </div>
                </div>
              </FilterSection>

              <div className="pt-4 space-y-2">
                <div className="text-xs text-muted-foreground mb-2">
                  {filteredModules.length} result{filteredModules.length !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpandedSections({
                        categories: true,
                        rootMethods: true,
                        androidVersions: true,
                        preferences: true,
                        status: true,
                        additional: true
                      })
                    }}
                    className="text-xs h-7"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpandedSections({
                        categories: false,
                        rootMethods: false,
                        androidVersions: false,
                        preferences: false,
                        status: false,
                        additional: false
                      })
                    }}
                    className="text-xs h-7"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>

              {isMobile && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount}</Badge>}
                    <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 ml-2">
                      Clear All Filters
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="flex-1"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Advanced Search</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {filteredModules.length} module{filteredModules.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide" : "Show"} Filters
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Label className="text-sm">Sort by:</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="downloads">Downloads</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="lastUpdated">Last Updated</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder}
                onValueChange={(value: "asc" | "desc") => setFilters((prev) => ({ ...prev, sortOrder: value }))}
              >
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Limit:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="w-20 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search modules, authors, features..."
                value={localQuery}
                onChange={(e) => {
                  setLocalQuery(e.target.value)
                  debouncedSearch(e.target.value)
                }}
                className="pl-10 h-9"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div className="p-4 md:p-6">
            {error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">Error loading modules: {error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : filteredModules.length > 0 ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredModules.length)} of {filteredModules.length} result{filteredModules.length !== 1 ? 's' : ''}
                    {filters.query && ` for "${filters.query}"`}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="h-8 w-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className={`grid gap-4 ${
                  showFilters && !isMobile
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                }`}>
                  {paginatedModules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      onClick={() => {
                        onModuleSelect(module)
                        if (isMobile && scrollRef.current) {
                          scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-9 w-9 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      <span className="text-sm text-muted-foreground px-3">
                        Page {currentPage} of {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-9 w-9 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="mb-4">
                  <p className="text-muted-foreground mb-2">No modules found matching your criteria.</p>
                  {filters.query && (
                    <p className="text-sm text-muted-foreground">Try adjusting your search term or filters</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  {filters.query && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLocalQuery('')
                        setFilters(prev => ({ ...prev, query: '' }))
                      }}
                    >
                      Clear Search
                    </Button>
                  )}
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
