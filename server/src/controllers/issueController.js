const prisma = require('../config/db');

// Valid status transitions
const ALLOWED_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'READY_FOR_TESTING', 'OPEN', 'CLOSED'],
  IN_PROGRESS: ['READY_FOR_TESTING', 'ASSIGNED', 'OPEN'],
  READY_FOR_TESTING: ['CLOSED', 'REOPENED', 'IN_PROGRESS'],
  REOPENED: ['IN_PROGRESS', 'ASSIGNED', 'READY_FOR_TESTING'],
  CLOSED: ['REOPENED', 'OPEN'],
};
const VALID_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const VALID_STATUSES = new Set(Object.keys(ALLOWED_TRANSITIONS));

function isOptionalText(value) {
  return value === undefined || value === null || typeof value === 'string';
}

async function generateNextIssueKey(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  // Extract a 3-letter prefix from project name, e.g. FinPay -> FIN
  const words = (project?.name || 'BUG').replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  let prefix = '';
  if (words.length >= 2) {
    prefix = (words[0][0] + words[1][0] + (words[1][1] || 'X')).toUpperCase();
  } else {
    prefix = (words[0].slice(0, 3)).toUpperCase();
  }
  if (prefix.length < 3) prefix = (prefix + 'BUG').slice(0, 3);

  // Count existing issues for this project
  const count = await prisma.issue.count({
    where: { projectId },
  });

  const nextNumber = 101 + count;
  let key = `${prefix}-${nextNumber}`;

  // Ensure uniqueness
  let exists = await prisma.issue.findUnique({ where: { issueKey: key } });
  let counter = nextNumber;
  while (exists) {
    counter++;
    key = `${prefix}-${counter}`;
    exists = await prisma.issue.findUnique({ where: { issueKey: key } });
  }

  return key;
}

async function createIssue(req, res, next) {
  try {
    const {
      projectId,
      title,
      description,
      stepsToReproduce,
      expectedResult,
      actualResult,
      environment,
      severity = 'MEDIUM',
      priority = 'MEDIUM',
      assigneeId,
    } = req.body;

    if (
      typeof projectId !== 'string'
      || typeof title !== 'string'
      || typeof description !== 'string'
      || !title.trim()
      || !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Project, title, and description are required.',
      });
    }
    if (title.trim().length > 200 || description.trim().length > 10000) {
      return res.status(400).json({ success: false, message: 'Title must be at most 200 characters and description at most 10,000.' });
    }
    if (!VALID_LEVELS.has(String(severity).toUpperCase()) || !VALID_LEVELS.has(String(priority).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Severity and priority must be LOW, MEDIUM, HIGH, or CRITICAL.' });
    }
    for (const [field, value] of Object.entries({ stepsToReproduce, expectedResult, actualResult, environment })) {
      if (!isOptionalText(value)) {
        return res.status(400).json({ success: false, message: `${field} must be a string or null.` });
      }
    }
    if (assigneeId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only administrators can assign a developer during issue creation.' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assigneeId,
          role: 'DEVELOPER',
          projectMembers: { some: { projectId } },
        },
        select: { id: true },
      });
      if (!assignee) {
        return res.status(400).json({ success: false, message: 'Assignee must be a developer who belongs to this project.' });
      }
    }

    const issueKey = await generateNextIssueKey(projectId);
    const initialStatus = assigneeId ? 'ASSIGNED' : 'OPEN';

    const issue = await prisma.issue.create({
      data: {
        issueKey,
        projectId,
        title: title.trim(),
        description: description.trim(),
        stepsToReproduce: stepsToReproduce ? stepsToReproduce.trim() : null,
        expectedResult: expectedResult ? expectedResult.trim() : null,
        actualResult: actualResult ? actualResult.trim() : null,
        environment: environment ? environment.trim() : 'Web / Chrome',
        severity: severity.toUpperCase(),
        priority: priority.toUpperCase(),
        status: initialStatus,
        reporterId: req.user.id,
        assigneeId: assigneeId || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Record creation activity
    await prisma.activity.create({
      data: {
        issueId: issue.id,
        userId: req.user.id,
        action: 'CREATED',
        newValue: `${issue.issueKey} created by ${req.user.name}`,
      },
    });

    if (assigneeId) {
      await prisma.activity.create({
        data: {
          issueId: issue.id,
          userId: req.user.id,
          action: 'ASSIGNED',
          oldValue: 'Unassigned',
          newValue: issue.assignee ? issue.assignee.name : assigneeId,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Bug report created successfully.',
      data: issue,
    });
  } catch (error) {
    next(error);
  }
}

async function getIssues(req, res, next) {
  try {
    const {
      projectId,
      status,
      severity,
      priority,
      assigneeId,
      reporterId,
      search,
    } = req.query;

    const where = {};

    if (projectId) where.projectId = projectId;
    if (status) {
      if (!VALID_STATUSES.has(status)) return res.status(400).json({ success: false, message: 'Invalid issue status filter.' });
      where.status = status;
    }
    if (severity) {
      if (!VALID_LEVELS.has(severity)) return res.status(400).json({ success: false, message: 'Invalid severity filter.' });
      where.severity = severity;
    }
    if (priority) {
      if (!VALID_LEVELS.has(priority)) return res.status(400).json({ success: false, message: 'Invalid priority filter.' });
      where.priority = priority;
    }
    if (assigneeId) where.assigneeId = assigneeId;
    if (reporterId) where.reporterId = reporterId;

    if (search) {
      if (typeof search !== 'string' || search.length > 200) {
        return res.status(400).json({ success: false, message: 'Search must be at most 200 characters.' });
      }
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { issueKey: { contains: search } },
      ];
    }

    // Role-based visibility:
    // If user is DEVELOPER and requested 'my', or if they only want their issues
    if (req.query.assignedToMe === 'true') {
      where.assigneeId = req.user.id;
    }
    if (req.query.reportedByMe === 'true') {
      where.reporterId = req.user.id;
    }
    if (req.user.role !== 'ADMIN') {
      where.project = { members: { some: { userId: req.user.id } } };
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            comments: true,
            activities: true,
            pullRequests: true,
            verifications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: issues,
    });
  } catch (error) {
    next(error);
  }
}

async function getIssueById(req, res, next) {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findFirst({
      where: {
        OR: [{ id }, { issueKey: id }],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            githubRepository: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, role: true, skills: true } },
              },
            },
          },
        },
        reporter: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true, role: true, skills: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        pullRequests: {
          orderBy: { createdAt: 'desc' },
        },
        verifications: {
          include: {
            tester: { select: { id: true, name: true, email: true } },
          },
          orderBy: { testedAt: 'desc' },
        },
      },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found.',
      });
    }

    return res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
}

async function updateIssue(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      stepsToReproduce,
      expectedResult,
      actualResult,
      environment,
      severity,
      priority,
      assigneeId,
      status,
    } = req.body;

    const existing = await prisma.issue.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }
    if (req.user.role !== 'ADMIN' && existing.reporterId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the reporter or an administrator can edit issue details.' });
    }
    if (status !== undefined || assigneeId !== undefined) {
      return res.status(400).json({ success: false, message: 'Use the dedicated status and assignment actions to change those fields.' });
    }

    const updateData = {};
    for (const [field, value] of Object.entries({
      title,
      description,
      stepsToReproduce,
      expectedResult,
      actualResult,
      environment,
    })) {
      if (value !== undefined && !isOptionalText(value)) {
        return res.status(400).json({ success: false, message: `${field} must be a string or null.` });
      }
    }
    if (title !== undefined) {
      if (!title.trim() || title.trim().length > 200) return res.status(400).json({ success: false, message: 'Title must be between 1 and 200 characters.' });
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      if (!description.trim() || description.trim().length > 10000) return res.status(400).json({ success: false, message: 'Description must be between 1 and 10,000 characters.' });
      updateData.description = description.trim();
    }
    for (const field of ['stepsToReproduce', 'expectedResult', 'actualResult', 'environment']) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field]?.trim() || null;
    }
    if (severity !== undefined) {
      if (!VALID_LEVELS.has(String(severity).toUpperCase())) return res.status(400).json({ success: false, message: 'Invalid severity.' });
      updateData.severity = severity.toUpperCase();
    }
    if (priority !== undefined) {
      if (!VALID_LEVELS.has(String(priority).toUpperCase())) return res.status(400).json({ success: false, message: 'Invalid priority.' });
      updateData.priority = priority.toUpperCase();
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one editable issue field is required.' });
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({
      success: true,
      message: 'Issue updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const nextStatus = status.toUpperCase();
    if (!VALID_STATUSES.has(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid issue status.' });
    }
    const issue = await prisma.issue.findUnique({ where: { id } });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (nextStatus === issue.status) {
      return res.status(400).json({ success: false, message: 'Issue is already in that status.' });
    }
    if (!ALLOWED_TRANSITIONS[issue.status]?.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: `Status cannot transition from ${issue.status} to ${nextStatus}.` });
    }

    if (req.user.role === 'DEVELOPER') {
      const developerTransitions = {
        ASSIGNED: ['IN_PROGRESS'],
        IN_PROGRESS: ['READY_FOR_TESTING'],
        REOPENED: ['IN_PROGRESS', 'READY_FOR_TESTING'],
      };
      if (issue.assigneeId !== req.user.id || !developerTransitions[issue.status]?.includes(nextStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Developers may only transition their assigned issues through the development workflow.',
        });
      }
    }

    if (req.user.role === 'TESTER') {
      if (nextStatus !== 'READY_FOR_TESTING') {
        return res.status(400).json({
          success: false,
          message: 'Testers must use QA verification to close or reopen an issue.',
        });
      }
    }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'DEVELOPER' && req.user.role !== 'TESTER') {
      return res.status(403).json({ success: false, message: 'Role is not allowed to transition issue status.' });
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    await prisma.activity.create({
      data: {
        issueId: id,
        userId: req.user.id,
        action: 'STATUS_CHANGE',
        oldValue: issue.status,
        newValue: nextStatus,
      },
    });

    return res.json({
      success: true,
      message: `Status transitioned from ${issue.status} to ${nextStatus}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function assignDeveloper(req, res, next) {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body;
    if (assigneeId !== null && typeof assigneeId !== 'string') {
      return res.status(400).json({ success: false, message: 'assigneeId must be a developer ID or null.' });
    }

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    let devName = 'Unassigned';
    if (assigneeId) {
      const dev = await prisma.user.findFirst({
        where: {
          id: assigneeId,
          role: 'DEVELOPER',
          projectMembers: { some: { projectId: issue.projectId } },
        },
      });
      if (!dev) {
        return res.status(400).json({ success: false, message: 'Assignee must be a developer who belongs to this project.' });
      }
      devName = dev.name;
    }

    const newStatus = assigneeId && issue.status === 'OPEN'
      ? 'ASSIGNED'
      : !assigneeId && issue.status === 'ASSIGNED'
        ? 'OPEN'
        : issue.status;

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        assigneeId: assigneeId || null,
        status: newStatus,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, skills: true } },
      },
    });

    await prisma.activity.create({
      data: {
        issueId: id,
        userId: req.user.id,
        action: 'ASSIGNED',
        oldValue: issue.assignee ? issue.assignee.name : 'Unassigned',
        newValue: devName,
      },
    });

    if (newStatus !== issue.status) {
      await prisma.activity.create({
        data: {
          issueId: id,
          userId: req.user.id,
          action: 'STATUS_CHANGE',
          oldValue: issue.status,
          newValue: newStatus,
        },
      });
    }

    return res.json({
      success: true,
      message: `Issue assigned to ${devName}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteIssue(req, res, next) {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found.' });

    await prisma.issue.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Issue deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  updateStatus,
  assignDeveloper,
  deleteIssue,
};
