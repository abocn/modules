import { describe, test, expect } from 'bun:test';
import { isValidGitHubPAT, GITHUB_PAT_REGEX } from '../lib/github-utils';

describe('GitHub PAT Validation', () => {
  test('validates 40-character classic GitHub PAT (ghp_)', () => {
    const classicPat = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
    expect(classicPat.length).toBe(40);
    expect(isValidGitHubPAT(classicPat)).toBe(true);
  });

  test('validates 93-character fine-grained GitHub PAT (github_pat_)', () => {
    const fineGrainedPat =
      'github_pat_11A1234567890123456789_12345678901234567890123456789012345678901234567890123456789';
    expect(fineGrainedPat.length).toBe(93);
    expect(isValidGitHubPAT(fineGrainedPat)).toBe(true);
  });

  test('validates other standard GitHub tokens (gho_, ghu_, ghs_, ghr_)', () => {
    expect(isValidGitHubPAT('gho_' + 'a'.repeat(36))).toBe(true);
    expect(isValidGitHubPAT('ghu_' + 'a'.repeat(36))).toBe(true);
    expect(isValidGitHubPAT('ghs_' + 'a'.repeat(36))).toBe(true);
    expect(isValidGitHubPAT('ghr_' + 'a'.repeat(36))).toBe(true);
  });

  test('trims whitespace when validating GitHub PATs', () => {
    const paddedPat =
      '  github_pat_11A1234567890123456789_12345678901234567890123456789012345678901234567890123456789  \n';
    expect(isValidGitHubPAT(paddedPat)).toBe(true);
  });

  test('rejects invalid token formats', () => {
    expect(isValidGitHubPAT('')).toBe(false);
    expect(isValidGitHubPAT('invalid_token')).toBe(false);
    expect(isValidGitHubPAT('ghp_short')).toBe(false);
    expect(isValidGitHubPAT('github_pat_too_short')).toBe(false);
    expect(isValidGitHubPAT('random_prefix_' + 'a'.repeat(40))).toBe(false);
  });
});
