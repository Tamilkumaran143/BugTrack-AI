const prisma = require('../config/db');

async function createProject(req, res, next) {
  try {
    const { name, description, githubRepository } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required.',
      });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ success: false, message: 'Project description must be a string.' });
    }
    if (githubRepository !== undefined && githubRepository !== null && typeof githubRepository !== 'string') {
      return res.status(400).json({ success: false, message: 'GitHub repository must be a string.' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        githubRepository: githubRepository ? githubRepository.trim() : null,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: req.user.role,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, role: true, skills: true } } } },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

async function getProjects(req, res, next) {
  try {
    // ADMIN can see all projects; TESTER/DEVELOPER can see projects they belong to
    let where = {};
    if (req.user.role !== 'ADMIN') {
      where = {
        members: {
          some: { userId: req.user.id },
        },
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            issues: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
}

async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, skills: true },
            },
          },
        },
        _count: {
          select: { issues: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, githubRepository } = req.body;

    const updateData = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Project name must be a non-empty string.' });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({ success: false, message: 'Project description must be a string or null.' });
      }
      updateData.description = description?.trim() || null;
    }
    if (githubRepository !== undefined) {
      if (githubRepository !== null && typeof githubRepository !== 'string') {
        return res.status(400).json({ success: false, message: 'GitHub repository must be a string or null.' });
      }
      updateData.githubRepository = githubRepository?.trim() || null;
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one project field is required.' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({
      success: true,
      message: 'Project updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function addMember(req, res, next) {
  try {
    const { id } = req.params; // projectId
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required.',
      });
    }
    if (role !== undefined && !['ADMIN', 'TESTER', 'DEVELOPER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Project role must be ADMIN, TESTER, or DEVELOPER.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const memberRole = role || user.role;

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: id, userId },
      },
      update: { role: memberRole },
      create: { projectId: id, userId, role: memberRole },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, skills: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Team member added/updated successfully.',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Project member not found.' });
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId: id, userId },
      },
    });

    return res.json({
      success: true,
      message: 'Team member removed from project.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
