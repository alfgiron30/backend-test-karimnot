import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

router.get('/', getUsers);
router.get('/:id', getUserById);

// requieren token admin
router.post('/', requireRole('Admin'), upload.single('profilePicture'), createUser);
router.put('/:id', requireRole('Admin'), upload.single('profilePicture'), updateUser);
router.delete('/:id', requireRole('Admin'), deleteUser);

export default router;