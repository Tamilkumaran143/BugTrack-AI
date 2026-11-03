const prisma = require('../config/db');

async function getSummary(req, res, next) {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) {
      filter.projectId = projectId;
    }

    const [
      totalProjects,
      totalIssues,
      openIssues,
      assignedIssues,
      inProgressIssues,
      readyForTestingIssues,
      closedIssues,
      reopenedIssues,
      criticalIssues,
      highIssues,
      totalUsers,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.issue.count({ where: filter }),
      prisma.issue.count({ where: { ...filter, status: 'OPEN' } }),
      prisma.issue.count({ where: { ...filter, status: 'ASSIGNED' } }),
      prisma.issue.count({ where: { ...filter, status: 'IN_PROGRESS' } }),
      prisma.issue.count({ where: { ...filter, status: 'READY_FOR_TESTING' } }),
      prisma.issue.count({ where: { ...filter, status: 'CLOSED' } }),
      prisma.issue.count({ where: { ...filter, status: 'REOPENED' } }),
      prisma.issue.count({ where: { ...filter, severity: 'CRITICAL' } }),
      prisma.issue.count({ where: { ...filter, severity: 'HIGH' } }),
      prisma.user.count(),
    ]);

    return res.json({
      success: true,
      data: {
        totalProjects,
        totalIssues,
        openIssues,
        assignedIssues,
        inProgressIssues,
        readyForTestingIssues,
        closedIssues,
        reopenedIssues,
        criticalIssues,
        highIssues,
        totalUsers,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) {
      filter.projectId = projectId;
    }

    // 1. Issues by Status
    const statusGroups = await prisma.issue.groupBy({
      by: ['status'],
      where: filter,
      _count: { status: true },
    });

    const statusCounts = [
      { status: 'OPEN', name: 'Open', count: 0, color: '#3b82f6' },
      { status: 'ASSIGNED', name: 'Assigned', count: 0, color: '#8b5cf6' },
      { status: 'IN_PROGRESS', name: 'In Progress', count: 0, color: '#f59e0b' },
      { status: 'READY_FOR_TESTING', name: 'Ready for Test', count: 0, color: '#06b6d4' },
      { status: 'REOPENED', name: 'Reopened', count: 0, color: '#ef4444' },
      { status: 'CLOSED', name: 'Closed', count: 0, color: '#10b981' },
    ];

    statusGroups.forEach((g) => {
      const match = statusCounts.find((s) => s.status === g.status);
      if (match) match.count = g._count.status;
    });

    // 2. Issues by Severity
    const severityGroups = await prisma.issue.groupBy({
      by: ['severity'],
      where: filter,
      _count: { severity: true },
    });

    const severityCounts = [
      { severity: 'CRITICAL', name: 'Critical', count: 0, color: '#ef4444' },
      { severity: 'HIGH', name: 'High', count: 0, color: '#f97316' },
      { severity: 'MEDIUM', name: 'Medium', count: 0, color: '#eab308' },
      { severity: 'LOW', name: 'Low', count: 0, color: '#10b981' },
    ];

    severityGroups.forEach((g) => {
      const match = severityCounts.find((s) => s.severity === g.severity);
      if (match) match.count = g._count.severity;
    });

    // 3. Issues by Priority
    const priorityGroups = await prisma.issue.groupBy({
      by: ['priority'],
      where: filter,
      _count: { priority: true },
    });

    const priorityCounts = [
      { priority: 'CRITICAL', name: 'Critical', count: 0, color: '#b91c1c' },
      { priority: 'HIGH', name: 'High', count: 0, color: '#ea580c' },
      { priority: 'MEDIUM', name: 'Medium', count: 0, color: '#ca8a04' },
      { priority: 'LOW', name: 'Low', count: 0, color: '#059669' },
    ];

    priorityGroups.forEach((g) => {
      const match = priorityCounts.find((p) => p.priority === g.priority);
      if (match) match.count = g._count.priority;
    });

    // 4. Developer Workload
    const developers = await prisma.user.findMany({
      where: { role: 'DEVELOPER' },
      select: {
        id: true,
        name: true,
        assignedIssues: {
          where: filter,
          select: { status: true },
        },
      },
    });

    const developerWorkload = developers.map((dev) => {
      const activeCount = dev.assignedIssues.filter((i) =>
        ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'READY_FOR_TESTING', 'REOPENED'].includes(i.status)
      ).length;
      const closedCount = dev.assignedIssues.filter((i) => i.status === 'CLOSED').length;
      return {
        developerId: dev.id,
        name: dev.name.split(' ')[0], // First name for chart labels
        fullName: dev.name,
        active: activeCount,
        closed: closedCount,
        total: dev.assignedIssues.length,
      };
    });

    // 5. Issue Creation Trend (Grouped by date over past 14 days)
    const allIssues = await prisma.issue.findMany({
      where: filter,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dateMap = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      dateMap[key] = { date: label, count: 0 };
    }

    allIssues.forEach((issue) => {
      const key = issue.createdAt.toISOString().split('T')[0];
      if (dateMap[key]) {
        dateMap[key].count++;
      }
    });

    const trend = Object.values(dateMap);

    return res.json({
      success: true,
      data: {
        byStatus: statusCounts,
        bySeverity: severityCounts,
        byPriority: priorityCounts,
        developerWorkload,
        creationTrend: trend,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getAnalytics,
};
