import express from 'express';
import { 
  register, 
  login, 
  refreshTokenHandler, 
  getCurrentUser, 
  listUsers, 
  recoverPassword, 
  registerSchema, 
  loginSchema 
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', refreshTokenHandler);
router.get('/me', authenticate, getCurrentUser);
router.get('/users', listUsers); // For demo quick user switcher
router.post('/recover-password', authRateLimiter, recoverPassword);

export default router;
