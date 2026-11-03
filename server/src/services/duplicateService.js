const prisma = require('../config/db');

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'let', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function calculateJaccardSimilarity(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  if (set1.size === 0 && set2.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...set1, ...set2]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

class DuplicateService {
  /**
   * Find similar existing issues in the project
   */
  async findDuplicates({ projectId, title = '', description = '', excludeIssueId = null }) {
    if (!projectId) {
      return [];
    }

    const newTitleTokens = tokenize(title);
    const newDescTokens = tokenize(description);
    const newAllTokens = [...newTitleTokens, ...newDescTokens];

    if (newAllTokens.length === 0) {
      return [];
    }

    const whereClause = { projectId };
    if (excludeIssueId) {
      whereClause.id = { not: excludeIssueId };
    }

    const existingIssues = await prisma.issue.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const results = [];

    for (const issue of existingIssues) {
      const issueTitleTokens = tokenize(issue.title);
      const issueDescTokens = tokenize(issue.description);
      const issueAllTokens = [...issueTitleTokens, ...issueDescTokens];

      // Calculate title similarity with 60% weight, description with 40% weight
      const titleSim = calculateJaccardSimilarity(newTitleTokens, issueTitleTokens);
      const descSim = calculateJaccardSimilarity(newDescTokens, issueDescTokens);
      const overallSim = calculateJaccardSimilarity(newAllTokens, issueAllTokens);

      const compositeScore = Math.max(
        overallSim,
        titleSim * 0.65 + descSim * 0.35
      );

      // Find overlapping keywords
      const matchedTokens = Array.from(
        new Set(newAllTokens.filter((token) => issueAllTokens.includes(token)))
      ).slice(0, 6);

      const percentage = Math.round(compositeScore * 100);

      // Filter to issues with meaningful similarity (> 15%)
      if (percentage >= 15 || (matchedTokens.length >= 2 && percentage >= 10)) {
        results.push({
          id: issue.id,
          issueKey: issue.issueKey,
          title: issue.title,
          status: issue.status,
          severity: issue.severity,
          priority: issue.priority,
          assignee: issue.assignee ? issue.assignee.name : 'Unassigned',
          similarityPercentage: Math.min(percentage, 99),
          matchedKeywords: matchedTokens,
        });
      }
    }

    // Sort descending by similarity
    results.sort((a, b) => b.similarityPercentage - a.similarityPercentage);

    return results.slice(0, 5);
  }
}

module.exports = new DuplicateService();
