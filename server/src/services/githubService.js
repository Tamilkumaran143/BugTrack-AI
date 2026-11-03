const axios = require('axios');
const config = require('../config');

class GitHubService {
  /**
   * Parse GitHub pull request URL
   * e.g. https://github.com/facebook/react/pull/28419
   */
  parsePrUrl(url) {
    if (!url || typeof url !== 'string') return null;

    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      return null;
    }
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 4 || segments[2] !== 'pull' || !/^\d+$/.test(segments[3])) return null;
    const [owner, repository] = segments;
    if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repository)) return null;
    const repo = repository.replace(/\.git$/i, '');

    return {
      owner,
      repo,
      prNumber: Number(segments[3]),
      fullName: `${owner}/${repo}`,
    };
  }

  /**
   * Parse GitHub repo URL
   * e.g. https://github.com/facebook/react
   */
  parseRepoUrl(url) {
    if (!url || typeof url !== 'string') return null;

    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      return null;
    }
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 2 || !/^[a-zA-Z0-9_.-]+$/.test(segments[0]) || !/^[a-zA-Z0-9_.-]+$/.test(segments[1])) return null;
    const [owner, repository] = segments;
    const repo = repository.replace(/\.git$/i, '');

    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
    };
  }

  /**
   * Fetch verified pull request details. Never invent PR metadata when GitHub is unavailable.
   */
  async fetchPullRequest(owner, repo, prNumber) {
    if (
      typeof owner !== 'string'
      || typeof repo !== 'string'
      || !/^[a-zA-Z0-9_.-]+$/.test(owner)
      || !/^[a-zA-Z0-9_.-]+$/.test(repo)
      || !Number.isSafeInteger(prNumber)
      || prNumber < 1
    ) {
      const error = new Error('Invalid GitHub repository or pull request identifier.');
      error.statusCode = 400;
      throw error;
    }

    const headers = {
      'User-Agent': 'BugTrack-AI-Platform',
      Accept: 'application/vnd.github.v3+json',
    };

    if (config.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${config.GITHUB_TOKEN}`;
    }

    try {
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
      const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

      const [prRes, filesRes] = await Promise.all([
        axios.get(prUrl, { headers, timeout: 8000 }),
        axios.get(filesUrl, { headers, timeout: 8000 }),
      ]);

      const pr = prRes.data;
      const files = (filesRes.data || []).map((f) => f.filename);

      return {
        repository: `${owner}/${repo}`,
        prNumber,
        title: pr.title,
        body: pr.body || '',
        state: pr.state || 'open',
        url: pr.html_url || `https://github.com/${owner}/${repo}/pull/${prNumber}`,
        changedFiles: files,
        author: pr.user?.login || 'unknown',
        merged: pr.merged || false,
        isLiveApi: true,
      };
    } catch (err) {
      const error = new Error(
        err.response?.status === 404
          ? 'GitHub pull request was not found or is not accessible.'
          : 'Unable to verify this pull request with the GitHub API. Check connectivity, permissions, and rate limits.',
      );
      error.statusCode = err.response?.status === 404 ? 404 : 502;
      throw error;
    }
  }

  /**
   * Validate repository existence or URL structure
   */
  async validateRepository(url) {
    const parsed = this.parseRepoUrl(url);
    if (!parsed) {
      return { valid: false, error: 'Invalid GitHub repository URL format. Example: https://github.com/facebook/react' };
    }

    const headers = {
      'User-Agent': 'BugTrack-AI-Platform',
      Accept: 'application/vnd.github.v3+json',
    };
    if (config.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${config.GITHUB_TOKEN}`;
    }

    try {
      const res = await axios.get(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
        headers,
        timeout: 5000,
      });

      return {
        valid: true,
        fullName: parsed.fullName,
        description: res.data.description,
        defaultBranch: res.data.default_branch,
        stars: res.data.stargazers_count,
      };
    } catch (err) {
      return {
        valid: false,
        fullName: parsed.fullName,
        error: err.response?.status === 404
          ? 'GitHub repository was not found or is not accessible.'
          : 'Unable to verify the repository with the GitHub API.',
      };
    }
  }
}

module.exports = new GitHubService();
