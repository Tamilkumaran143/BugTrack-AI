const geminiService = require('../services/geminiService');
const duplicateService = require('../services/duplicateService');
const assignmentService = require('../services/assignmentService');
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

module.exports = {
  structureReport,
  findDuplicates,
  suggestPriority,
  reviewChange,
  recommendDeveloper,
};
