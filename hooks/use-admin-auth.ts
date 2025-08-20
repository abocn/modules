import { useAdminAuth as useAdminAuthFromContext } from '@/lib/auth-context'
import { useRequireAdmin as useRequireAdminFromCached } from '@/hooks/use-cached-auth'

export const useAdminAuth = useAdminAuthFromContext
export const useRequireAdmin = useRequireAdminFromCached