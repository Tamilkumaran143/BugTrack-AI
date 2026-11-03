const prisma = require('../config/db');

async function addComment(req, res, next) {
  try {
    const { id } = req.params; // issueId
    const { message } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Comment message must be a non-empty string.' });
    }
    if (message.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Comment message must be at most 5,000 characters.' });
    }

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          issueId: id,
          userId: req.user.id,
          message: message.trim(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      await tx.activity.create({
        data: {
          issueId: id,
          userId: req.user.id,
          action: 'COMMENTED',
          newValue: `Comment added by ${req.user.name}`,
        },
      });
      return created;
    });

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

async function getComments(req, res, next) {
  try {
    const { id } = req.params; // issueId

    const comments = await prisma.comment.findMany({
      where: { issueId: id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addComment,
  getComments,
};
