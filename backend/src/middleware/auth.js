import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../errors/appErrors.js';

export const ROLES = {
  PASSENGER: 'PASSENGER',
  CARRIER: 'CARRIER',
  ADMIN: 'ADMIN',
};

/**
 * Sign temporary JWT Access Token (short-lived)
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

/**
 * Sign JWT Refresh Token (longer-lived)
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/**
 * Express middleware requiring a valid Bearer token
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Отсутствует токен авторизации (Bearer token)'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Срок действия токена истек. Используйте refresh token.', { code: 'TOKEN_EXPIRED' }));
    }
    return next(new UnauthorizedError('Недействительный токен авторизации', { code: 'INVALID_TOKEN' }));
  }
}

/**
 * Optional authentication: attaches user if token is provided, does not fail if absent
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) guard middleware
 * @param  {...string} roles Allowed roles ('ADMIN', 'CARRIER', 'PASSENGER')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Необходима авторизация для доступа к этому ресурсу'));
    }

    if (!roles.includes(req.user.role) && req.user.role !== ROLES.ADMIN) {
      return next(new ForbiddenError(`Недостаточно прав. Требуется одна из ролей: [${roles.join(', ')}], ваша роль: ${req.user.role}`));
    }

    next();
  };
}
