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

    if (!projectId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Project, title, and description are required.',
      });
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
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (reporterId) where.reporterId = reporterId;

    if (search) {
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

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (stepsToReproduce !== undefined) updateData.stepsToReproduce = stepsToReproduce ? stepsToReproduce.trim() : null;
    if (expectedResult !== undefined) updateData.expectedResult = expectedResult ? expectedResult.trim() : null;
    if (actualResult !== undefined) updateData.actualResult = actualResult ? actualResult.trim() : null;
    if (environment !== undefined) updateData.environment = environment ? environment.trim() : null;
    if (severity !== undefined) updateData.severity = severity.toUpperCase();
    if (priority !== undefined) updateData.priority = priority.toUpperCase();

    // Assignee change
    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
      updateData.assigneeId = assigneeId || null;
      let newAssigneeName = 'Unassigned';
      if (assigneeId) {
        const newDev = await prisma.user.findUnique({ where: { id: assigneeId } });
        newAssigneeName = newDev ? newDev.name : assigneeId;
        // If status was OPEN, transition to ASSIGNED
        if (existing.status === 'OPEN') {
          updateData.status = 'ASSIGNED';
        }
      }

      await prisma.activity.create({
        data: {
          issueId: existing.id,
          userId: req.user.id,
          action: 'ASSIGNED',
          oldValue: existing.assignee ? existing.assignee.name : 'Unassigned',
          newValue: newAssigneeName,
        },
      });
    }

    // Status change
    if (status !== undefined && status !== existing.status) {
      const newStatus = status.toUpperCase();
      updateData.status = newStatus;

      await prisma.activity.create({
        data: {
          issueId: existing.id,
          userId: req.user.id,
          action: 'STATUS_CHANGE',
          oldValue: existing.status,
          newValue: newStatus,
        },
      });
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

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const nextStatus = status.toUpperCase();
    const issue = await prisma.issue.findUnique({ where: { id } });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    // Role checks on status updates
    // TESTER: can verify (READY_FOR_TESTING -> CLOSED or REOPENED)
    // DEVELOPER: can start work (ASSIGNED -> IN_PROGRESS), finish work (IN_PROGRESS -> READY_FOR_TESTING)
    // ADMIN: can make any status transition
    if (req.user.role === 'DEVELOPER') {
      if (['CLOSED'].includes(nextStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Developers cannot close issues directly. Please move to READY_FOR_TESTING for QA verification.',
        });
      }
    }

    if (req.user.role === 'TESTER') {
      if (issue.status !== 'READY_FOR_TESTING' && nextStatus === 'CLOSED') {
        return res.status(400).json({
          success: false,
          message: 'Only issues currently READY_FOR_TESTING can be verified and closed by QA.',
        });
      }
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

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    let devName = 'Unassigned';
    if (assigneeId) {
      const dev = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!dev) {
        return res.status(404).json({ success: false, message: 'Developer user not found.' });
      }
      devName = dev.name;
    }

    const newStatus = assigneeId && issue.status === 'OPEN' ? 'ASSIGNED' : issue.status;

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
