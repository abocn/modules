import { MODULE_CATEGORIES } from '@/lib/constants/categories'

interface NavigationItem {
  id: string
  label: string
  path: string
  description?: string
}

interface APIEndpoint {
  method: string
  path: string
  description: string
  auth?: boolean
}

export function getSidebarNavigation() {
  const browseItems: NavigationItem[] = [
    { id: 'home', label: 'Home', path: '/', description: 'Browse all modules' },
    { id: 'search', label: 'Advanced Search', path: '/search', description: 'Find specific modules' },
    { id: 'featured', label: 'Featured', path: '/featured', description: "Editor's choice modules" },
    { id: 'recent', label: 'Recently Updated', path: '/recent', description: 'Latest module updates' },
    { id: 'recommended', label: 'Recommended', path: '/recommended', description: 'Community recommended modules' },
  ]

  const categoryItems: NavigationItem[] = MODULE_CATEGORIES.map(cat => ({
    id: cat.id,
    label: cat.label,
    path: `/category/${cat.id}`,
    description: `Browse ${cat.shortLabel} modules`
  }))

  const accountItems: NavigationItem[] = [
    { id: 'submit-module', label: 'Submit Module', path: '/submit', description: 'Submit your own module' },
    { id: 'my-submissions', label: 'My Submissions', path: '/my-submissions', description: 'View your submitted modules' },
    { id: 'settings', label: 'Settings', path: '/settings', description: 'Account settings' },
  ]

  return {
    browse: browseItems,
    categories: categoryItems,
    account: accountItems
  }
}

export function getNavigationStructure() {
  const nav = getSidebarNavigation()

  const adminItems: NavigationItem[] = []

  return {
    browse: nav.browse,
    categories: nav.categories,
    account: nav.account,
    admin: adminItems
  }
}

export function generateNavigationSection(baseUrl: string, includeUserFeatures: boolean = true) {
  const nav = getSidebarNavigation()

  let section = '## Navigation\n\n'

  section += '### Main Pages\n'
  nav.browse.forEach(item => {
    section += `- [${item.label}](${baseUrl}${item.path}): ${item.description}\n`
  })

  section += '\n### Categories\n'
  nav.categories.forEach(item => {
    section += `- [${item.label}](${baseUrl}${item.path}): ${item.description}\n`
  })

  if (includeUserFeatures) {
    section += '\n### Account Features\n'
    nav.account.forEach(item => {
      section += `- [${item.label}](${baseUrl}${item.path}): ${item.description}\n`
    })
  }

  return section
}

export async function getAPIEndpoints(): Promise<APIEndpoint[]> {
  const endpoints: APIEndpoint[] = []

  const publicEndpoints: APIEndpoint[] = [
    { method: 'GET', path: '/api/modules', description: 'List all approved modules' },
    { method: 'GET', path: '/api/modules/[id]', description: 'Get module details' },
    { method: 'GET', path: '/api/modules/[id]/releases', description: 'Get module releases' },
    { method: 'GET', path: '/api/modules/[id]/ratings', description: 'Get module ratings' },
    { method: 'POST', path: '/api/modules/submit', description: 'Submit a new module' },
    { method: 'GET', path: '/api/modules/my-submissions', description: 'Get user submissions', auth: true },
    { method: 'PUT', path: '/api/modules/update/[id]', description: 'Update module', auth: true },
    { method: 'GET', path: '/api/modules/[id]/download', description: 'Download module' },
    { method: 'POST', path: '/api/modules/[id]/helpful-votes', description: 'Mark a module review as helpful', auth: true },
  ]

  const settingsEndpoints: APIEndpoint[] = [
    { method: 'GET', path: '/api/settings/profile', description: 'Get user profile', auth: true },
    { method: 'PUT', path: '/api/settings/profile', description: 'Update user profile', auth: true },
    { method: 'POST', path: '/api/settings/github-pat', description: 'Set GitHub PAT', auth: true },
    { method: 'POST', path: '/api/settings/github-pat/validate', description: 'Validate GitHub PAT', auth: true },
  ]

  const ratingsEndpoints: APIEndpoint[] = [
    { method: 'POST', path: '/api/ratings/[id]/helpful', description: 'Mark rating as helpful', auth: true },
    { method: 'POST', path: '/api/ratings/[id]/replies', description: 'Reply to rating', auth: true },
  ]

  const repliesEndpoints: APIEndpoint[] = [
    { method: 'POST', path: '/api/replies/[id]/helpful', description: 'Mark reply as helpful', auth: true },
  ]

  endpoints.push(...publicEndpoints, ...settingsEndpoints, ...ratingsEndpoints, ...repliesEndpoints)

  return endpoints
}

export function generateAPISection(endpoints: APIEndpoint[], includeAdminSection: boolean = false) {
  let section = '## API Endpoints\n\n'

  const publicEndpoints = endpoints.filter(e => !e.auth || e.path.includes('auth'))
  const authEndpoints = endpoints.filter(e => e.auth && !e.path.includes('admin') && !e.path.includes('auth'))
  const adminEndpoints = endpoints.filter(e => e.path.includes('admin'))

  section += '### Public Endpoints\n'
  publicEndpoints.forEach(endpoint => {
    section += `- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}\n`
  })

  section += '\n### Authenticated Endpoints\n'
  authEndpoints.forEach(endpoint => {
    section += `- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}\n`
  })

  if (includeAdminSection && adminEndpoints.length > 0) {
    section += '\n### Admin Endpoints\n'
    adminEndpoints.forEach(endpoint => {
      section += `- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}\n`
    })
  }

  return section
}

export function generateModuleSubmissionSection(baseUrl: string) {
  return `## Module Submission

### Submission Process
1. **Authentication**: Sign in with GitHub or Google
2. **Navigate**: Go to [Submit Module](${baseUrl}/submit)
3. **Module Information**:
   - Name and descriptions (short and full)
   - Category selection from predefined categories
   - Author information
   - License type (MIT, GPL, Apache, etc.)
4. **Technical Details**:
   - Compatibility (Android versions, root methods)
   - Features list
   - Open source status
5. **Resources**:
   - Download links or GitHub repository
   - Source code URL (if open source)
   - Community/support URL
   - Icon and screenshots
6. **Review**: Submit for admin review

### Module Requirements
- Must be functional and tested
- Clear description of functionality
- Proper versioning
- No malicious code

### After Submission
- Module enters review queue
- Admin reviews submission for quality
- Approved modules become publicly available
- You can update your modules anytime`
}