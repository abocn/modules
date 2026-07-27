import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

export const GITHUB_PAT_REGEX = /^(?:gh[a-z]_|github_pat_)[a-zA-Z0-9_]{36,251}$/;

export function isValidGitHubPAT(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  return GITHUB_PAT_REGEX.test(token.trim());
}

export interface GitHubRepo {
  owner: string;
  repo: string;
}

export function parseGitHubRepo(url: string): GitHubRepo | null {
  try {
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/, // Just owner/repo format
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
export function extractGithubRepo(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    if (url.hostname !== 'github.com') return null;

    const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
    if (pathParts.length < 2) return null;

    return `${pathParts[0]}/${pathParts[1].replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

export async function validateGitHubPAT(
  token: string,
): Promise<{ valid: boolean; user?: string; error?: string }> {
  try {
    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.rest.users.getAuthenticated();

    return {
      valid: true,
      user: user.login,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid GitHub PAT',
    };
  }
}

export async function getGitHubReleases(token: string, owner: string, repo: string) {
  try {
    const octokit = new Octokit({ auth: token });

    const { data: releases } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 10,
    });

    return releases;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch releases: ${message}`);
  }
}

export function hashGitHubPAT(token: string, salt: string): string {
  return crypto.pbkdf2Sync(token, salt, 100000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyGitHubPAT(token: string, hashedToken: string, salt: string): boolean {
  const hash = hashGitHubPAT(token, salt);
  return hash === hashedToken;
}

/**
 * Fetches the content of a README file given a GitHub repo URL,
 * GitHub blob URL, or raw GitHub URL.
 *
 * @param input GitHub URL or owner/repo format
 * @returns The README text content
 */
export async function fetchReadmeContent(input: string): Promise<string> {
  let urlStr = input.trim();
  if (!urlStr) {
    throw new Error('Please enter a URL');
  }

  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(urlStr)) {
    urlStr = `https://github.com/${urlStr}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(
      urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`,
    );
  } catch {
    throw new Error('Invalid URL format');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  const tryFetchText = async (targetUrl: string, isApi = false): Promise<string | null> => {
    try {
      const headers: Record<string, string> = isApi
        ? { Accept: 'application/vnd.github.raw+json' }
        : {};
      const res = await fetch(targetUrl, { headers });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) return text;
      }
    } catch {
      // Ignore network errors and try fallbacks
    }
    return null;
  };

  // Case 1: raw.githubusercontent.com or direct .md URL
  if (
    hostname === 'raw.githubusercontent.com' ||
    (!hostname.includes('github.com') && parsedUrl.pathname.endsWith('.md'))
  ) {
    const text = await tryFetchText(parsedUrl.toString());
    if (text) return text;
    throw new Error('Failed to fetch README from the provided URL');
  }

  // Case 2: github.com URL
  if (hostname === 'github.com') {
    const pathname = parsedUrl.pathname.replace(/\/$/, '');
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL: missing owner or repository');
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');

    // Subcase 2a: blob URL, e.g. /owner/repo/blob/main/README.md
    if (parts.length >= 4 && parts[2] === 'blob') {
      const rest = parts.slice(3).join('/');
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
      let text = await tryFetchText(rawUrl);
      if (text) return text;

      // Fallback API call for blob
      const branch = parts[3];
      const filePath = parts.slice(4).join('/');
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      text = await tryFetchText(apiUrl, true);
      if (text) return text;

      throw new Error('Failed to fetch README from the provided GitHub blob URL');
    }

    // Subcase 2b: Repo URL
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    let text = await tryFetchText(apiUrl, true);
    if (text) return text;

    const fallbacks = [
      `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/readme.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/readme.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`,
    ];

    for (const fbUrl of fallbacks) {
      text = await tryFetchText(fbUrl);
      if (text) return text;
    }

    throw new Error('Could not find or fetch README for this repository');
  }

  const text = await tryFetchText(parsedUrl.toString());
  if (text) return text;

  throw new Error('Failed to fetch content from the provided URL');
}
function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Parses the "Features" section from a README markdown string
 * and extracts feature bullet points as an array of strings.
 *
 * @param readmeContent Markdown content of the README
 * @returns Array of extracted feature strings (max 25 features, max 100 chars each)
 */
export function parseFeaturesFromReadme(readmeContent: string): string[] {
  if (!readmeContent || typeof readmeContent !== 'string') {
    return [];
  }

  const lines = readmeContent.split(/\r?\n/);
  let inFeaturesSection = false;
  let sectionLevel = 0;
  const features: string[] = [];
  const rawParagraphLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for ATX heading (# Features, ## Features, ### Key Features, etc.)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      if (/features/i.test(title)) {
        inFeaturesSection = true;
        sectionLevel = level;
        continue;
      } else if (inFeaturesSection && level <= sectionLevel) {
        // Reached another section at equal or higher level (e.g., ## Features -> ## Installation)
        break;
      }
    }

    if (inFeaturesSection) {
      // Check for bullet list item: *, -, +, or numbers 1., 1)
      const listMatch = line.match(/^\s*(?:[*+\-]|\d+[.)])\s+(.+)$/);
      if (listMatch) {
        let itemText = cleanInlineMarkdown(listMatch[1]);

        // Skip category/group headers ending with a colon (e.g., "Modules:")
        if (itemText.endsWith(':')) {
          continue;
        }

        // Enforce maximum length of 100 characters per feature
        if (itemText.length > 100) {
          itemText = itemText.slice(0, 100).trim();
        }

        if (itemText && !features.includes(itemText)) {
          features.push(itemText);
          if (features.length >= 25) {
            break;
          }
        }
      } else if (line.trim() && !line.trim().startsWith('#')) {
        // Keep non-empty paragraph lines as potential fallback if no bullets found
        const cleanLine = cleanInlineMarkdown(line);
        if (cleanLine && !cleanLine.endsWith(':')) {
          rawParagraphLines.push(cleanLine);
        }
      }
    }
  }

  // Fallback: If no bullet list items were found in Features section, use paragraph lines
  if (features.length === 0 && rawParagraphLines.length > 0) {
    for (let pLine of rawParagraphLines) {
      if (pLine.length > 100) {
        pLine = pLine.slice(0, 100).trim();
      }
      if (pLine && !features.includes(pLine)) {
        features.push(pLine);
        if (features.length >= 25) {
          break;
        }
      }
    }
  }

  return features;
}
