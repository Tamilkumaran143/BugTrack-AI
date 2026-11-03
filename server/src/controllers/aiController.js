const geminiService = require('../services/geminiService');
const duplicateService = require('../services/duplicateService');
const assignmentService = require('../services/assignmentService');
const fixAssistantService = require('../services/fixAssistantService');
const prisma = require('../config/db');

async function structureReport(req, res, next) {
  try {
    const { rawDescription } = req.body;

    if (!rawDescription || typeof rawDescription !== 'string' || rawDescription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'rawDescription is required to structure a bug report.',
      });
    }

    const report = await geminiService.structureBugReport(rawDescription);

    return res.json({
      success: true,
      message: 'Bug report structured successfully.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function findDuplicates(req, res, next) {
  try {
    const { projectId, title, description, excludeIssueId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'projectId is required for duplicate detection.',
      });
    }

    const duplicates = await duplicateService.findDuplicates({
      projectId,
      title: title || '',
      description: description || '',
      excludeIssueId,
    });

    return res.json({
      success: true,
      data: duplicates,
    });
  } catch (error) {
    next(error);
  }
}

async function suggestPriority(req, res, next) {
  try {
    const { title, description, severity } = req.body;

    const recommendation = await geminiService.suggestPriority({
      title,
      description,
      severity,
    });

    return res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
}

async function reviewChange(req, res, next) {
  try {
    const { prData, issueId, issueData } = req.body;

    let issue = issueData;
    if (!issue && issueId) {
      issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: { issueKey: true, title: true, description: true, severity: true },
      });
    }

    if (!prData) {
      return res.status(400).json({
        success: false,
        message: 'prData is required for code change risk analysis.',
      });
    }

    const analysis = await geminiService.analyzeCodeChangeRisk(prData, issue || {});

    return res.json({
      success: true,
      message: 'Code change risk analysis completed.',
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

async function recommendDeveloper(req, res, next) {
  try {
    const { projectId, title, description, environment } = req.body;

    const recommendations = await assignmentService.recommendDevelopers(projectId, {
      title,
      description,
      environment,
    });

    return res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

async function analyzeFixAssistant(req, res, next) {
  try {
    const { issueId, issueData } = req.body;

    if (!issueId && !issueData) {
      return res.status(400).json({
        success: false,
        message: 'issueId or issueData is required for the AI Fix Assistant analysis.',
      });
    }

    const result = await fixAssistantService.analyzeIssueFix({
      issueId,
      issueData,
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message: 'AI Fix Assistant analysis completed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function analyzeRepository(req, res, next) {
  try {
    const { projectId } = req.body;
    const result = await fixAssistantService.analyzeRepository({ projectId });

    return res.json({
      success: true,
      message: 'Repository analysis completed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function generateFixSuggestion(req, res, next) {
  try {
    const { issueId, issueData } = req.body;

    const issue = issueId ? await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: { select: { id: true, name: true, githubRepository: true } } },
    }) : issueData;

    if (!issue) {
      return res.status(400).json({
        success: false,
        message: 'Issue information is required before a fix suggestion can be generated.',
      });
    }

    const normalizedIssue = {
      title: issue.title,
      description: issue.description,
      stepsToReproduce: issue.stepsToReproduce,
      expectedResult: issue.expectedResult,
      actualResult: issue.actualResult,
      severity: issue.severity,
      priority: issue.priority,
      status: issue.status,
      environment: issue.environment,
      project: issue.project,
    };

    const result = await fixAssistantService.buildFixSuggestion(
      { ...normalizedIssue, id: issue.id || issueId },
      {},
      req.user.id,
    );

    return res.json({
      success: true,
      message: 'Fix proposal generated.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function validateFix(req, res, next) {
  try {
    const { issueId, issueData, runFullValidation = false } = req.body;
    if (typeof runFullValidation !== 'boolean') {
      return res.status(400).json({ success: false, message: 'runFullValidation must be a boolean.' });
    }
    let verifiedIssue = issueData;
    if (issueId) {
      verifiedIssue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: { project: { select: { id: true, name: true } } },
      });
      if (!verifiedIssue) return res.status(404).json({ success: false, message: 'Issue not found.' });
    }
    const result = await fixAssistantService.validateFixProcess({
      issueData: verifiedIssue,
      runFullValidation,
    });

    const failed = result.status === 'validation_failed';
    return res.status(failed ? 422 : 200).json({
      success: !failed,
      message: failed ? 'Fix validation failed.' : 'Fix validation completed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function applyFix(req, res, next) {
  try {
    const { proposalId, issueId, approved } = req.body;
    if (typeof proposalId !== 'string' || typeof issueId !== 'string' || approved !== true) {
      return res.status(400).json({
        success: false,
        message: 'An explicit approval, proposal ID, and issue ID are required before applying a patch.',
      });
    }

    const result = fixAssistantService.applyApprovedFix({
      proposalId,
      issueId,
      userId: req.user.id,
      approved,
    });

    return res.json({
      success: true,
      message: `Approved patch applied to ${result.appliedFiles.length} source file(s).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function rollbackFix(req, res, next) {
  try {
    const { operationId, issueId } = req.body;
    if (typeof operationId !== 'string' || typeof issueId !== 'string') {
      return res.status(400).json({ success: false, message: 'operationId and issueId are required.' });
    }
    const result = fixAssistantService.rollbackAppliedFix({
      operationId,
      issueId,
      userId: req.user.id,
      isAdmin: req.user.role === 'ADMIN',
    });
    return res.json({ success: true, message: 'Applied patch rolled back.', data: result });
  } catch (error) {
    next(error);
  }
}

function getFixHistory(req, res, next) {
  try {
    const history = fixAssistantService.getFixHistory(req.params.id);
    return res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  structureReport,
  findDuplicates,
  suggestPriority,
  reviewChange,
  recommendDeveloper,
  analyzeFixAssistant,
  analyzeRepository,
  generateFixSuggestion,
  validateFix,
  applyFix,
  rollbackFix,
  getFixHistory,
};
