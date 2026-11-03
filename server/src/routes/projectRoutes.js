const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = require('../controllers/projectController');
const { authenticate, authorize, requireProjectMember } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('ADMIN'), createProject);
router.get('/', getProjects);
router.get('/:id', requireProjectMember(), getProjectById);
router.put('/:id', authorize('ADMIN'), updateProject);
router.delete('/:id', authorize('ADMIN'), deleteProject);

router.post('/:id/members', authorize('ADMIN'), addMember);
router.delete('/:id/members/:userId', authorize('ADMIN'), removeMember);

module.exports = router;
