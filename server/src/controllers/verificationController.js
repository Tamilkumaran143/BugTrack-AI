const prisma = require('../config/db');

async function createVerification(req, res, next) {
  try {
    const { id } = req.params; // issueId
    const { result, testNotes } = req.body;

    if (!result || !['PASSED', 'FAILED'].includes(result.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Verification result must be either 'PASSED' or 'FAILED'.",
      });
    }

    const verifiedResult = result.toUpperCase();

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    // Create verification record
    const verification = await prisma.verification.create({
      data: {
        issueId: id,
        testerId: req.user.id,
        result: verifiedResult,
        testNotes: testNotes ? testNotes.trim() : null,
      },
      include: {
        tester: { select: { id: true, name: true, email: true } },
      },
    });

    // Lifecycle status transition rule:
    // If PASSED -> CLOSED
    // If FAILED -> REOPENED
    const targetStatus = verifiedResult === 'PASSED' ? 'CLOSED' : 'REOPENED';

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: { status: targetStatus },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    });

    // Record Activity
    await prisma.activity.create({
      data: {
        issueId: id,
        userId: req.user.id,
        action: 'VERIFIED',
        oldValue: issue.status,
        newValue: `${verifiedResult}: ${targetStatus}`,
      },
    });

    await prisma.activity.create({
      data: {
        issueId: id,
        userId: req.user.id,
        action: 'STATUS_CHANGE',
        oldValue: issue.status,
        newValue: targetStatus,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Regression test verification submitted. Issue status transitioned to ${targetStatus}.`,
      data: {
        verification,
        issue: updatedIssue,
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
