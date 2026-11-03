const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generateToken } = require('../utils/jwt');

async function register(req, res, next) {
  try {
    const { name, email, password, role = 'DEVELOPER', skills = 'General' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const validRoles = ['ADMIN', 'TESTER', 'DEVELOPER'];
    const assignedRole = validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'DEVELOPER';

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        skills: skills.trim(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        skills: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      skills: user.skills,
      createdAt: user.createdAt,
    };

    return res.json({
      success: true,
      message: 'Signed in successfully.',
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        skills: true,
        createdAt: true,
        _count: {
          select: {
            assignedIssues: true,
            reportedIssues: true,
            projectMembers: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        skills: true,
        createdAt: true,
        _count: {
          select: {
            assignedIssues: {
              where: {
                status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'] },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        activeWorkload: u._count.assignedIssues,
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, skills, currentPassword, newPassword } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (skills) updateData.skills = skills.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect current password.',
        });
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        skills: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
  getUsers,
  updateProfile,
};
