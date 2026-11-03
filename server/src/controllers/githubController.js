const githubService = require('../services/githubService');
const geminiService = require('../services/geminiService');
const prisma = require('../config/db');

async function connectRepo(req, res, next) {
  try {
    const { projectId, repoUrl } = req.body;

    if (!projectId || !repoUrl) {
      return res.status(400).json({
        success: false,
        message: 'projectId and repoUrl are required.',
      });
    }

    const validation = await githubService.validateRepository(repoUrl);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error || 'Invalid GitHub repository.',
      });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { githubRepository: repoUrl.trim() },
    });

    return res.json({
      success: true,
      message: `Repository ${validation.fullName} connected to project successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function linkPullRequest(req, res, next) {
  try {
    const { issueId, prUrl, customPrData } = req.body;

    if (!issueId) {
      return res.status(400).json({ success: false, message: 'issueId is required.' });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    let prInfo = null;

    if (customPrData && customPrData.prNumber && customPrData.repository) {
      // Manual PR data fallback
      prInfo = {
        repository: customPrData.repository,
        prNumber: parseInt(customPrData.prNumber, 10),
        title: customPrData.title || `PR #${customPrData.prNumber}`,
        body: customPrData.body || '',
        state: customPrData.state || 'open',
        url: customPrData.url || `https://github.com/${customPrData.repository}/pull/${customPrData.prNumber}`,
        changedFiles: Array.isArray(customPrData.changedFiles) ? customPrData.changedFiles : [],
      };
    } else if (prUrl) {
      const parsed = githubService.parsePrUrl(prUrl);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GitHub PR URL. Format: https://github.com/owner/repo/pull/123',
        });
      }

      prInfo = await githubService.fetchPullRequest(parsed.owner, parsed.repo, parsed.prNumber);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either prUrl or customPrData is required.',
      });
    }

    // Run AI Code Change Risk Analysis
    const riskAnalysis = await geminiService.analyzeCodeChangeRisk(prInfo, issue);

    // Save Pull Request in database
    const savedPr = await prisma.pullRequest.create({
      data: {
        issueId: issue.id,
        repository: prInfo.repository,
        prNumber: prInfo.prNumber,
        title: prInfo.title,
        url: prInfo.url,
        state: prInfo.state,
        changedFiles: JSON.stringify(prInfo.changedFiles || []),
        aiSummary: riskAnalysis.changeSummary || prInfo.body || 'PR linked',
        riskNotes: JSON.stringify(riskAnalysis),
      },
    });

    // Record activity
    await prisma.activity.create({
      data: {
        issueId: issue.id,
        userId: req.user.id,
        action: 'PR_LINKED',
        oldValue: null,
        newValue: `Linked PR #${prInfo.prNumber} (${prInfo.repository}) - Risk: ${riskAnalysis.riskLevel}`,
      },
    });

    // Optionally auto transition issue to READY_FOR_TESTING if it was IN_PROGRESS
    let updatedIssue = issue;
    if (issue.status === 'IN_PROGRESS' || issue.status === 'ASSIGNED') {
      updatedIssue = await prisma.issue.update({
        where: { id: issue.id },
        data: { status: 'READY_FOR_TESTING' },
      });

      await prisma.activity.create({
        data: {
          issueId: issue.id,
          userId: req.user.id,
          action: 'STATUS_CHANGE',
          oldValue: issue.status,
          newValue: 'READY_FOR_TESTING',
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Pull Request linked and analyzed successfully.',
      data: {
        pullRequest: {
          ...savedPr,
          changedFiles: JSON.parse(savedPr.changedFiles),
          riskNotes: JSON.parse(savedPr.riskNotes),
        },
        issue: updatedIssue,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getPrDetails(req, res, next) {
  try {
    const { owner, repo, number } = req.params;
    const prNumber = parseInt(number, 10);

    if (!owner || !repo || isNaN(prNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid owner, repo, or PR number.' });
    }

    const prInfo = await githubService.fetchPullRequest(owner, repo, prNumber);

    return res.json({
      success: true,
      data: prInfo,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  connectRepo,
  linkPullRequest,
  getPrDetails,
};
