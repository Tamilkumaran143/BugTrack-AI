const prisma = require('../config/db');

async function createVerification(req, res, next) {
  try {
    const { id } = req.params; // issueId
    const { result, testNotes } = req.body;

    if (typeof result !== 'string' || !['PASSED', 'FAILED'].includes(result.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Verification result must be either 'PASSED' or 'FAILED'.",
      });
    }
    if (testNotes !== undefined && testNotes !== null && typeof testNotes !== 'string') {
      return res.status(400).json({ success: false, message: 'Test notes must be a string or null.' });
    }
    if (testNotes && testNotes.length > 5000) {
      return res.status(400).json({ success: false, message: 'Test notes must be at most 5,000 characters.' });
    }

    const verifiedResult = result.toUpperCase();

    const targetStatus = verifiedResult === 'PASSED' ? 'CLOSED' : 'REOPENED';
    const resultData = await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.findUnique({ where: { id } });
      if (!issue) {
        const error = new Error('Issue not found.');
        error.statusCode = 404;
        throw error;
      }
      if (issue.status !== 'READY_FOR_TESTING') {
        const error = new Error('Only issues in READY_FOR_TESTING can be verified.');
        error.statusCode = 409;
        throw error;
      }

      const verification = await tx.verification.create({
        data: {
          issueId: id,
          testerId: req.user.id,
          result: verifiedResult,
          testNotes: testNotes?.trim() || null,
        },
        include: {
          tester: { select: { id: true, name: true, email: true } },
        },
      });

      const updatedIssue = await tx.issue.update({
        where: { id },
        data: { status: targetStatus },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          reporter: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.activity.createMany({
        data: [
          {
            issueId: id,
            userId: req.user.id,
            action: 'VERIFIED',
            oldValue: issue.status,
            newValue: `${verifiedResult}: ${targetStatus}`,
          },
          {
            issueId: id,
            userId: req.user.id,
            action: 'STATUS_CHANGE',
            oldValue: issue.status,
            newValue: targetStatus,
          },
        ],
      });

      return { issue, verification, updatedIssue };
    });

    return res.status(201).json({
      success: true,
      message: `Regression test verification submitted. Issue status transitioned to ${targetStatus}.`,
      data: {
        verification: resultData.verification,
        issue: resultData.updatedIssue,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVerifications(req, res, next) {
  try {
    const { id } = req.params; // issueId

    const verifications = await prisma.verification.findMany({
      where: { issueId: id },
      include: {
        tester: { select: { id: true, name: true, email: true } },
      },
      orderBy: { testedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: verifications,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVerification,
  getVerifications,
};
