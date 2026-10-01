import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { loginSchema, registerSchema } from '../middleware/validators.js';
import { signToken } from '../middleware/auth.js';
import { parseBody } from '../utils/query.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Cookie options for the JWT.
 * In production the API and the web app live on different domains, so the cookie
 * has to be SameSite=None + Secure for the browser to send it.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

function sendAuth(res, status, user, token) {
  res.cookie(config.cookieName, token, cookieOptions());
  res.status(status).json({
    success: true,
    data: { user: { id: user._id, name: user.name, email: user.email, role: user.role } },
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = parseBody(registerSchema, req.body);

  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password: await User.hashPassword(password),
  });

  sendAuth(res, 201, user, signToken(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body);

  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password so the endpoint
  // cannot be used to find out which emails are registered.
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  sendAuth(res, 200, user, signToken(user));
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(config.cookieName, { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, message: 'Signed out' });
});

/** Used by the frontend to know if the cookie is still valid. */
export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
    },
  });
});
