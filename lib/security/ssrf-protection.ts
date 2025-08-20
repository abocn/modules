import { URL } from 'url'
import dns from 'dns/promises'
import net from 'net'

/**
 * SSRF validation result
 * @interface SSRFValidationResult
 */
interface SSRFValidationResult {
  safe: boolean
  error?: string
  resolvedIP?: string
}

/**
 * List of blocked hostnames and patterns
 */
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '[::ffff:127.0.0.1]',
]

/**
 * Private IP ranges (CIDR notation)
 */
const PRIVATE_IP_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  'fc00::/7',
  'fe80::/10',
  '::1/128',
  '127.0.0.0/8'
]

/**
 * Allowed protocols for external requests
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:']

/**
 * Check if an IP address is private
 *
 * @param ip - The IP address to check
 * @returns True if the IP is private, false otherwise
 */
function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) {
    return false
  }

  const isIPv6 = net.isIPv6(ip)

  for (const range of PRIVATE_IP_RANGES) {
    if (isIPInRange(ip, range, isIPv6)) {
      return true
    }
  }

  return false
}

/**
 * Check if an IP is within a CIDR range
 *
 * @param ip - The IP address to check
 * @param cidr - The CIDR range
 * @param isIPv6 - Whether the IP is IPv6
 * @returns True if IP is in range
 */
function isIPInRange(ip: string, cidr: string, isIPv6: boolean): boolean {
  const [range, bits] = cidr.split('/')

  if ((cidr.includes(':') !== isIPv6) || (ip.includes(':') !== isIPv6)) {
    return false
  }

  if (isIPv6) {
    return isIPv6InRange(ip, range, parseInt(bits))
  } else {
    return isIPv4InRange(ip, range, parseInt(bits))
  }
}

/**
 * Check if IPv4 address is in CIDR range
 */
function isIPv4InRange(ip: string, range: string, bits: number): boolean {
  const ipParts = ip.split('.').map(Number)
  const rangeParts = range.split('.').map(Number)

  let ipNum = 0
  let rangeNum = 0

  for (let i = 0; i < 4; i++) {
    ipNum = (ipNum << 8) + ipParts[i]
    rangeNum = (rangeNum << 8) + rangeParts[i]
  }

  const mask = (0xFFFFFFFF << (32 - bits)) >>> 0
  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Check if IPv6 address is in CIDR range
 */
function isIPv6InRange(ip: string, range: string, bits: number): boolean {
  const normalizeIPv6 = (addr: string) => {
    const parts = addr.split(':')
    const fullParts: string[] = []

    for (const part of parts) {
      if (part === '') {
        const missing = 8 - parts.filter(p => p !== '').length
        for (let i = 0; i <= missing; i++) {
          fullParts.push('0000')
        }
      } else {
        fullParts.push(part.padStart(4, '0'))
      }
    }

    return fullParts.slice(0, 8).join('')
  }

  const ipHex = normalizeIPv6(ip)
  const rangeHex = normalizeIPv6(range)
  const hexBits = Math.floor(bits / 4)

  return ipHex.substring(0, hexBits) === rangeHex.substring(0, hexBits)
}

/**
 * Validate a URL for SSRF vulnerabilities
 *
 * Performs validation:
 * - Protocol validation
 * - Hostname blocking
 * - DNS resolution
 * - Private IP detection
 * - DNS rebinding protection
 *
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns Validation result with safety status
 */
export async function validateURL(
  url: string,
  options: {
    allowedHosts?: string[]
    allowPrivateIPs?: boolean
    timeout?: number
  } = {}
): Promise<SSRFValidationResult> {
  try {
    const parsedUrl = new URL(url)

    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return {
        safe: false,
        error: `Protocol ${parsedUrl.protocol} is not allowed`
      }
    }

    const hostname = parsedUrl.hostname.toLowerCase()

    if (BLOCKED_HOSTS.includes(hostname)) {
      return {
        safe: false,
        error: `Hostname ${hostname} is blocked`
      }
    }

    if (options.allowedHosts && options.allowedHosts.length > 0) {
      const isAllowed = options.allowedHosts.some(allowed =>
        hostname === allowed || hostname.endsWith(`.${allowed}`)
      )

      if (!isAllowed) {
        return {
          safe: false,
          error: `Hostname ${hostname} is not in the allowed list`
        }
      }
    }

    if (net.isIP(hostname)) {
      if (!options.allowPrivateIPs && isPrivateIP(hostname)) {
        return {
          safe: false,
          error: `Private IP address ${hostname} is not allowed`
        }
      }

      return {
        safe: true,
        resolvedIP: hostname
      }
    }

    try {
      const [ipv4Addresses, ipv6Addresses] = await Promise.all([
        dns.resolve4(hostname).catch(() => [] as string[]),
        dns.resolve6(hostname).catch(() => [] as string[])
      ])

      const addresses = [...ipv4Addresses, ...ipv6Addresses]

      if (!addresses || addresses.length === 0) {
        return {
          safe: false,
          error: `Could not resolve hostname ${hostname}`
        }
      }

      for (const ip of addresses) {
        if (!options.allowPrivateIPs && isPrivateIP(ip)) {
          return {
            safe: false,
            error: `Hostname ${hostname} resolves to private IP ${ip}`
          }
        }
      }

      const [primaryIP] = addresses

      await new Promise(resolve => setTimeout(resolve, 100))

      const [revalidationIPv4, revalidationIPv6] = await Promise.all([
        dns.resolve4(hostname).catch(() => [] as string[]),
        dns.resolve6(hostname).catch(() => [] as string[])
      ])

      const revalidationAddresses = [...revalidationIPv4, ...revalidationIPv6]

      if (!revalidationAddresses.includes(primaryIP)) {
        return {
          safe: false,
          error: `DNS rebinding detected for ${hostname}`
        }
      }

      return {
        safe: true,
        resolvedIP: primaryIP
      }
    } catch {
      return {
        safe: false,
        error: `DNS resolution failed for ${hostname}`
      }
    }
  } catch (error) {
    return {
      safe: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Create a safe fetch wrapper with SSRF protection
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Fetch response or throws error
 */
export async function safeFetch(
  url: string,
  options: RequestInit & {
    allowedHosts?: string[]
    allowPrivateIPs?: boolean
    validateSSRF?: boolean
  } = {}
): Promise<Response> {
  if (options.validateSSRF !== false) {
    const validation = await validateURL(url, {
      allowedHosts: options.allowedHosts,
      allowPrivateIPs: options.allowPrivateIPs
    })

    if (!validation.safe) {
      throw new Error(`SSRF validation failed: ${validation.error}`)
    }
  }

  const { ...fetchOptions } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      redirect: 'manual'
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        const validation = await validateURL(location, {
          allowedHosts: options.allowedHosts,
          allowPrivateIPs: options.allowPrivateIPs
        })

        if (!validation.safe) {
          throw new Error(`Redirect validation failed: ${validation.error}`)
        }
      }
    }

    return response
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Check if a URL is safe without resolving DNS
 *
 * Quick validation for URLs without DNS resolution,
 * useful for initial filtering.
 *
 * @param url - The URL to check
 * @returns True if URL passes basic checks
 */
export function isURLSafeQuick(url: string): boolean {
  try {
    const parsedUrl = new URL(url)

    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false
    }

    const hostname = parsedUrl.hostname.toLowerCase()

    if (BLOCKED_HOSTS.includes(hostname)) {
      return false
    }

    if (net.isIP(hostname) && isPrivateIP(hostname)) {
      return false
    }

    return true
  } catch {
    return false
  }
}