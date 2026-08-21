import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getUsers);
router.get('/:id', getUserById);

// requieren token admin
router.post('/', requireRole('Admin'), createUser);
router.put('/:id', requireRole('Admin'), updateUser);
router.delete('/:id', requireRole('Admin'), deleteUser);

export default router;