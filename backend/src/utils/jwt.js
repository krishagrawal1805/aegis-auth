import jwt from 'jsonwebtoken';

// Use env variable or fallback for hackathon development ease
const SECRET = process.env.JWT_SECRET || 'aegis-hackathon-super-secret-key-2026';

export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: '12h' });
};

export const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

export const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  });
};

export const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
};
