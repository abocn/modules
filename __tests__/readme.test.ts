import { describe, test, expect } from 'bun:test';
import { fetchReadmeContent, parseFeaturesFromReadme } from '../lib/github-utils';

describe('fetchReadmeContent', () => {
  test('fetches README content from GitHub repo URL', async () => {
    const content = await fetchReadmeContent('https://github.com/NoName-exe/revanced-extended');
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });

  test('fetches README content from GitHub blob URL', async () => {
    const content = await fetchReadmeContent(
      'https://github.com/NoName-exe/revanced-extended/blob/main/README.md',
    );
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });

  test('fetches README content from raw GitHub URL', async () => {
    const content = await fetchReadmeContent(
      'https://raw.githubusercontent.com/NoName-exe/revanced-extended/refs/heads/main/README.md',
    );
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });

  test('fetches README content from owner/repo format', async () => {
    const content = await fetchReadmeContent('NoName-exe/revanced-extended');
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });

  test('throws error for empty input', async () => {
    expect(fetchReadmeContent('')).rejects.toThrow('Please enter a URL');
  });

  test('throws error for invalid URL format', async () => {
    expect(
      fetchReadmeContent('https://github.com/invalid-user-99999/invalid-repo-99999'),
    ).rejects.toThrow();
  });
});
describe('parseFeaturesFromReadme', () => {
  test('parses features section with nested bullets as provided in spec', () => {
    const readme = `
## Features
 * Updated with the latest versions of patches.
 * Cleans APKs from unneeded libs to make them smaller.
 * Fully open-source, every binary or APK is compiled without human intervention.
 * Modules:
     * Recompile invalidated odex for YouTube and YouTube-Music for faster usage.
     * Receive updates from Magisk app.
     * Should not break safetynet or trigger root detections used by certain apps.
     * Handle installation of the correct version of the stock app and all that.
     * Support Magisk and KernelSU.

## Installation
Follow the steps to install...
`;

    const features = parseFeaturesFromReadme(readme);
    expect(features).toEqual([
      'Updated with the latest versions of patches.',
      'Cleans APKs from unneeded libs to make them smaller.',
      'Fully open-source, every binary or APK is compiled without human intervention.',
      'Recompile invalidated odex for YouTube and YouTube-Music for faster usage.',
      'Receive updates from Magisk app.',
      'Should not break safetynet or trigger root detections used by certain apps.',
      'Handle installation of the correct version of the stock app and all that.',
      'Support Magisk and KernelSU.',
    ]);
  });

  test('parses features with different bullet types and removes markdown formatting', () => {
    const readme = `
# My Awesome Module

### Key Features
- **Fast performance**: optimized for Android 14
* Support for [Magisk](https://github.com/topjohnwu/Magisk) and KernelSU
+ \`Battery saver\` mode included
1. Automatic updates via app
2) Zero root detection footprint

## Usage
Run the module.
`;

    const features = parseFeaturesFromReadme(readme);
    expect(features).toEqual([
      'Fast performance: optimized for Android 14',
      'Support for Magisk and KernelSU',
      'Battery saver mode included',
      'Automatic updates via app',
      'Zero root detection footprint',
    ]);
  });

  test('returns empty array if no Features section exists', () => {
    const readme = `
# My Module
## Overview
Just a cool module.
## License
MIT
`;
    expect(parseFeaturesFromReadme(readme)).toEqual([]);
  });

  test('handles empty input gracefully', () => {
    expect(parseFeaturesFromReadme('')).toEqual([]);
  });

  test('enforces max length of 100 characters per feature and max 25 features', () => {
    const longFeature = 'a'.repeat(150);
    let items = '';
    for (let i = 0; i < 30; i++) {
      items += `- Feature ${i} ${longFeature}\n`;
    }
    const readme = `## Features\n${items}`;

    const features = parseFeaturesFromReadme(readme);
    expect(features.length).toBe(25);
    expect(features[0].length).toBe(100);
  });
});
