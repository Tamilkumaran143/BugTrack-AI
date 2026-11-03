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
    const { issueId, prUrl } = req.body;

    if (typeof issueId !== 'string' || typeof prUrl !== 'string' || !prUrl.trim()) {
      return res.status(400).json({ success: false, message: 'A real GitHub pull request URL and issueId are required.' });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }
    if (req.user.role === 'DEVELOPER' && issue.assigneeId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned developer can link a pull request.' });
    }

    const parsed = githubService.parsePrUrl(prUrl);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub PR URL. Use https://github.com/owner/repo/pull/123.',
      });
    }
    const prInfo = await githubService.fetchPullRequest(parsed.owner, parsed.repo, parsed.prNumber);
    const configuredRepository = githubService.parseRepoUrl(issue.project.githubRepository);
    if (configuredRepository && configuredRepository.fullName.toLowerCase() !== prInfo.repository.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'The pull request repository does not match the project repository.' });
    }
    const existingPr = await prisma.pullRequest.findFirst({
      where: { issueId: issue.id, repository: prInfo.repository, prNumber: prInfo.prNumber },
      select: { id: true },
    });
    if (existingPr) {
      return res.status(409).json({ success: false, message: 'This pull request is already linked to the issue.' });
    }

    // Run AI Code Change Risk Analysis
    const riskAnalysis = await geminiService.analyzeCodeChangeRisk(prInfo, issue);
    const shouldMoveToTesting = issue.status === 'IN_PROGRESS' && prInfo.merged;
    const saved = await prisma.$transaction(async (tx) => {
      const pullRequest = await tx.pullRequest.create({
        data: {
          issueId: issue.id,
          repository: prInfo.repository,
          prNumber: prInfo.prNumber,
          title: prInfo.title,
          url: prInfo.url,
          state: prInfo.state,
          changedFiles: JSON.stringify(prInfo.changedFiles),
          aiSummary: riskAnalysis.changeSummary || prInfo.body || 'Pull request linked.',
          riskNotes: JSON.stringify(riskAnalysis),
        },
      });

      const updatedIssue = shouldMoveToTesting
        ? await tx.issue.update({
            where: { id: issue.id },
            data: { status: 'READY_FOR_TESTING' },
          })
        : issue;

      await tx.activity.createMany({
        data: [
          {
            issueId: issue.id,
            userId: req.user.id,
            action: 'PR_LINKED',
            newValue: `Linked verified PR #${prInfo.prNumber} (${prInfo.repository}) - Risk: ${riskAnalysis.riskLevel}`,
          },
          ...(shouldMoveToTesting
            ? [{
                issueId: issue.id,
                userId: req.user.id,
                action: 'STATUS_CHANGE',
                oldValue: issue.status,
                newValue: 'READY_FOR_TESTING',
              }]
            : []),
        ],
      });

      return { pullRequest, issue: updatedIssue };
    });

    return res.status(201).json({
      success: true,
      message: shouldMoveToTesting
        ? 'Verified pull request linked and merged fix moved to QA.'
        : 'Verified pull request linked and analyzed.',
      data: {
        pullRequest: {
          ...saved.pullRequest,
          changedFiles: JSON.parse(saved.pullRequest.changedFiles),
          riskNotes: JSON.parse(saved.pullRequest.riskNotes),
        },
        issue: saved.issue,
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
