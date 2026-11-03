const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No bearer token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        skills: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' lacks permission for this action. Allowed: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

function requireProjectMember(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required.' });
      }

      // System Admins always have access
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not a registered member of this project.',
        });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Requires project role of ${allowedRoles.join(' or ')}.`,
        });
      }

      req.projectMember = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireIssueProjectMember() {
  return async (req, res, next) => {
    try {
      const issue = await prisma.issue.findFirst({
        where: { OR: [{ id: req.params.id }, { issueKey: req.params.id }] },
        select: { projectId: true },
      });

      if (!issue) {
        return res.status(404).json({ success: false, message: 'Issue not found.' });
      }
      if (req.user.role === 'ADMIN') return next();

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: issue.projectId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ success: false, message: 'Issue not found.' });
      }

      req.issueProjectId = issue.projectId;
      req.projectMember = membership;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function requireIssueProjectMemberFromBody({ required = true } = {}) {
  return async (req, res, next) => {
    try {
      const issueId = req.body?.issueId;
      if (!issueId && !required) return next();
      if (typeof issueId !== 'string' || !issueId.trim()) {
        return res.status(400).json({ success: false, message: 'Issue ID is required.' });
      }

      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: { projectId: true },
      });
      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found.' });
      if (req.user.role === 'ADMIN') return next();

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: issue.projectId,
            userId: req.user.id,
          },
        },
      });
      if (!membership) return res.status(404).json({ success: false, message: 'Issue not found.' });

      req.issueProjectId = issue.projectId;
      req.projectMember = membership;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  authenticate,
  authorize,
  requireProjectMember,
  requireIssueProjectMember,
  requireIssueProjectMemberFromBody,
};
