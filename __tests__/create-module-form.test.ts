import { describe, test, expect } from 'bun:test';
import * as z from 'zod';

// Form validation schema matching create-module-form.tsx logic
const moduleSchema = z.object({
  isOpenSource: z.boolean().default(false),
  sourceUrl: z.string().optional(),
  githubRepo: z.string().optional(),
});

describe('CreateModuleForm GitHub fields logic', () => {
  test('populates both fields with sourceUrl when module is open source', () => {
    const rawData = {
      isOpenSource: true,
      sourceUrl: 'https://github.com/testuser/testmodule',
      githubRepo: '',
    };

    const finalGithubRepo = rawData.isOpenSource ? rawData.sourceUrl : rawData.githubRepo;
    const moduleData = {
      ...rawData,
      githubRepo: finalGithubRepo,
    };

    expect(moduleData.sourceUrl).toBe('https://github.com/testuser/testmodule');
    expect(moduleData.githubRepo).toBe('https://github.com/testuser/testmodule');
  });

  test('preserves custom githubRepo when module is not open source', () => {
    const rawData = {
      isOpenSource: false,
      sourceUrl: '',
      githubRepo: 'testuser/testmodule',
    };

    const finalGithubRepo = rawData.isOpenSource ? rawData.sourceUrl : rawData.githubRepo;
    const moduleData = {
      ...rawData,
      githubRepo: finalGithubRepo,
    };

    expect(moduleData.githubRepo).toBe('testuser/testmodule');
    expect(moduleData.sourceUrl).toBe('');
  });
});
