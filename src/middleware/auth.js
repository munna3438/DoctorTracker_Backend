import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Reads the JWT from the httpOnly cookie, loads the user and puts it on req.user.
 * The user is loaded on every request so deleted or demoted accounts lose access
 * immediately instead of waiting for the token to expire.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[config.cookieName];
  if (!token) throw ApiError.unauthorized('Please sign in to continue');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Session expired, please sign in again');
  }

  const user = await User.findById(payload.sub).select('name email role');
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  req.user = user;
  next();
});

/** Blocks the request unless the signed in user has the given role. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have access to this resource'));
    }
    next();
  };
}
