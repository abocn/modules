import { describe, test, expect } from 'bun:test';
import { MAX_DESCRIPTION, moduleSubmissionSchema, LICENSES } from '../lib/validations/module';
import { getLicenseLabel, getLicenseOptions } from '../lib/utils/license-utils';

describe('Module description validation', () => {
  test('MAX_DESCRIPTION constant is 30000', () => {
    expect(MAX_DESCRIPTION).toBe(30000);
  });

  test('accepts description up to 30000 characters', () => {
    const validData = {
      name: 'Test Module',
      shortDescription: 'A valid short description',
      description: 'A'.repeat(30000),
      author: 'TestAuthor',
      category: 'system',
      license: 'MIT',
      isOpenSource: false,
      features: ['Feature 1'],
      compatibility: {
        androidVersions: ['14+'],
        rootMethods: ['Magisk'],
      },
    };

    const result = moduleSubmissionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('rejects description longer than 30000 characters', () => {
    const invalidData = {
      name: 'Test Module',
      shortDescription: 'A valid short description',
      description: 'A'.repeat(30001),
      author: 'TestAuthor',
      category: 'system',
      license: 'MIT',
      isOpenSource: false,
      features: ['Feature 1'],
      compatibility: {
        androidVersions: ['14+'],
        rootMethods: ['Magisk'],
      },
    };

    const result = moduleSubmissionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const descriptionError = result.error.issues.find((issue) =>
        issue.path.includes('description'),
      );
      expect(descriptionError?.message).toContain('30000');
    }
  });
});

describe('No License support', () => {
  test('LICENSES includes "No License"', () => {
    expect(LICENSES).toContain('No License');
  });

  test('accepts "No License" as a valid module submission license', () => {
    const validData = {
      name: 'Test Module',
      shortDescription: 'A valid short description',
      description: 'Module description that meets minimum length requirement.',
      author: 'TestAuthor',
      category: 'system',
      license: 'No License',
      isOpenSource: false,
      features: ['Feature 1'],
      compatibility: {
        androidVersions: ['14+'],
        rootMethods: ['Magisk'],
      },
    };

    const result = moduleSubmissionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('getLicenseLabel returns "No License" for "No License"', () => {
    expect(getLicenseLabel('No License')).toBe('No License');
  });

  test('getLicenseOptions includes "No License" option', () => {
    const options = getLicenseOptions();
    const noLicenseOption = options.find((opt) => opt.value === 'No License');
    expect(noLicenseOption).toEqual({ value: 'No License', label: 'No License' });
  });
});
