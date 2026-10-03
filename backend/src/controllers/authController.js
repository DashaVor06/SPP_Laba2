import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/db.js';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../errors/appErrors.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, ROLES } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const registerSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  phone: z.string().optional().default(''),
  role: z.enum([ROLES.PASSENGER, ROLES.CARRIER, ROLES.ADMIN]).optional().default(ROLES.PASSENGER),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export async function register(req, res, next) {
  try {
    const { email, password, name, phone, role } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      throw new ConflictError('Пользователь с таким email уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await query(`
      INSERT INTO users (email, password_hash, name, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, phone, role, created_at;
    `, [email, passwordHash, name, phone, role]);

    const user = insertRes.rows[0];
    const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, refreshToken, expiresAt]);

    logger.info('User registered successfully', { userId: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rowCount === 0) {
      throw new UnauthorizedError('Неверный email или пароль');
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Неверный email или пароль');
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save or update refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at;
    `, [user.id, refreshToken, expiresAt]);

    logger.info('User logged in', { userId: user.id, email: user.email, role: user.role });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatar_url,
    };

    return res.status(200).json({
      success: true,
      message: 'Успешный вход в систему',
      data: {
        user: safeUser,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenHandler(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new BadRequestError('Параметр refreshToken обязателен');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Недействительный или просроченный refresh token');
    }

    const tokenInDb = await query('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP', [refreshToken]);
    if (tokenInDb.rowCount === 0) {
      throw new UnauthorizedError('Refresh token отозван или не найден в активных сессиях');
    }

    const userRes = await query('SELECT id, email, role, name, phone FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rowCount === 0) {
      throw new NotFoundError('Пользователь не найден');
    }

    const user = userRes.rows[0];
    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const userRes = await query('SELECT id, email, name, phone, role, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      throw new NotFoundError('Пользователь не найден');
    }
    return res.status(200).json({
      success: true,
      data: userRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const result = await query('SELECT id, email, name, phone, role, created_at FROM users ORDER BY id ASC');
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function recoverPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      throw new BadRequestError('Email обязателен для восстановления доступа');
    }

    // Lab 3 requirement stub: logs recovery link and returns confirmation
    logger.info('Password recovery link generated for user', { email });

    return res.status(200).json({
      success: true,
      message: `Инструкция по сбросу пароля отправлена на адрес ${email} (в учебной среде сымитировано).`,
    });
  } catch (error) {
    next(error);
  }
}
