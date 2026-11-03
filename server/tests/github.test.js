import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import githubService from '../src/services/githubService';

const require = createRequire(import.meta.url);
const axios = require('axios');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub integration', () => {
  it('accepts only HTTPS GitHub pull request URLs', () => {
    expect(githubService.parsePrUrl('https://github.com/acme/app/pull/42')).toMatchObject({
      owner: 'acme',
      repo: 'app',
      prNumber: 42,
      fullName: 'acme/app',
    });
    expect(githubService.parsePrUrl('https://evil.example/github.com/acme/app/pull/42')).toBeNull();
    expect(githubService.parsePrUrl('http://github.com/acme/app/pull/42')).toBeNull();
  });

  it('reports an unavailable pull request instead of inventing details', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 404 } });

    await expect(githubService.fetchPullRequest('acme', 'app', 42)).rejects.toMatchObject({
      statusCode: 404,
      message: 'GitHub pull request was not found or is not accessible.',
    });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('does not claim a repository was verified when the API cannot confirm it', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 404 } });

    await expect(githubService.validateRepository('https://github.com/acme/missing')).resolves.toMatchObject({
      valid: false,
      error: 'GitHub repository was not found or is not accessible.',
    });
    expect(get).toHaveBeenCalledTimes(1);
  });
});
