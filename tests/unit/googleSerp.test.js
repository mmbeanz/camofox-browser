import { describe, expect, jest, test } from '@jest/globals';
import { hasGoogleOrganicResults, pageHasGoogleOrganicResult } from '../../lib/google-serp.js';

describe('pageHasGoogleOrganicResult', () => {
  function runDetector(linkHref, baseURI = 'https://www.google.com/search?q=test') {
    const heading = { closest: () => ({ href: linkHref }) };
    globalThis.document = {
      querySelector: () => ({ querySelectorAll: () => [heading] }),
      baseURI,
    };
    return pageHasGoogleOrganicResult();
  }

  test('accepts direct external links', () => {
    expect(runDetector('https://example.com/article')).toBe(true);
  });

  test('accepts google-hosted goto and url wrappers', () => {
    expect(runDetector('/goto?url=https://example.com/article')).toBe(true);
    expect(runDetector('/url?q=https://example.com/article')).toBe(true);
  });

  test('rejects ad links and other google paths', () => {
    expect(runDetector('/aclk?sa=L')).toBe(false);
    expect(runDetector('/search?q=test')).toBe(false);
  });

  test('rejects non-http links', () => {
    expect(runDetector('javascript:void(0)')).toBe(false);
  });
});

describe('hasGoogleOrganicResults', () => {
  test('returns immediately when an organic card is present', async () => {
    const page = {
      isClosed: jest.fn(() => false),
      evaluate: jest.fn().mockResolvedValue(true),
      waitForFunction: jest.fn(),
    };

    await expect(hasGoogleOrganicResults(page)).resolves.toBe(true);
    expect(page.waitForFunction).not.toHaveBeenCalled();
  });

  test('waits for cards before classifying a Google shell as empty', async () => {
    const page = {
      isClosed: jest.fn(() => false),
      evaluate: jest.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false),
      waitForFunction: jest.fn().mockRejectedValue(new Error('timeout')),
    };

    await expect(hasGoogleOrganicResults(page)).resolves.toBe(false);
    expect(page.waitForFunction).toHaveBeenCalledWith(expect.any(Function), { timeout: 5000 });
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  test('accepts organic cards that render during the wait', async () => {
    const page = {
      isClosed: jest.fn(() => false),
      evaluate: jest.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
    };

    await expect(hasGoogleOrganicResults(page)).resolves.toBe(true);
  });

  test('returns false for a closed page', async () => {
    const page = { isClosed: jest.fn(() => true) };

    await expect(hasGoogleOrganicResults(page)).resolves.toBe(false);
  });
});
