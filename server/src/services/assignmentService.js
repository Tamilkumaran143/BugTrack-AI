const prisma = require('../config/db');

class AssignmentService {
  /**
   * Recommend developers for an issue based on skills match & current workload
   */
  async recommendDevelopers(projectId, issueData = {}) {
    const { title = '', description = '', environment = '' } = issueData;
    const combinedIssueText = `${title} ${description} ${environment}`.toLowerCase();

    // 1. Fetch developers in this project (or all system developers if not in project yet)
    let developers = [];
    if (projectId) {
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId,
          user: { role: 'DEVELOPER' },
        },
        include: { user: true },
      });

      developers = projectMembers.map((pm) => pm.user);
    }

    // Fallback to all developers if none found in project
    if (developers.length === 0) {
      developers = await prisma.user.findMany({
        where: { role: 'DEVELOPER' },
      });
    }

    if (developers.length === 0) {
      return [];
    }

    // 2. Fetch active workload for each developer
    const activeStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];

    const recommendations = [];

    for (const dev of developers) {
      const activeIssueCount = await prisma.issue.count({
        where: {
          assigneeId: dev.id,
          status: { in: activeStatuses },
        },
      });

      // Analyze skills match
      const devSkills = (dev.skills || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const matchedSkills = [];
      devSkills.forEach((skill) => {
        if (combinedIssueText.includes(skill)) {
          matchedSkills.push(skill);
        }
      });

      // Calculate score:
      // Base score: 50
      // +15 per matched skill (up to 40)
      // -10 per active issue (workload penalty)
      let score = 50 + matchedSkills.length * 15 - activeIssueCount * 8;
      if (score < 10) score = 10;
      if (score > 98) score = 98;

      let workloadStatus = 'Light';
      if (activeIssueCount >= 4) {
        workloadStatus = 'Heavy';
      } else if (activeIssueCount >= 2) {
        workloadStatus = 'Moderate';
      }

      let rationale = '';
      if (matchedSkills.length > 0) {
        rationale = `Matches relevant skills: ${matchedSkills.join(', ')}. Current workload: ${activeIssueCount} active issue(s) (${workloadStatus}).`;
      } else {
        rationale = `Available capacity (${activeIssueCount} active issues, ${workloadStatus} workload).`;
      }

      recommendations.push({
        developerId: dev.id,
        name: dev.name,
        email: dev.email,
        skills: dev.skills,
        matchedSkills,
        activeIssueCount,
        workloadStatus,
        matchScore: score,
        rationale,
      });
    }

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return recommendations;
  }
}

module.exports = new AssignmentService();
