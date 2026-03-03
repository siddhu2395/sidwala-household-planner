const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sidwala-super-secret-jwt-key-change-me';
const JWT_EXPIRY = '24h';

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'sidwala-super-secret-jwt-key-change-me') {
  console.warn('WARNING: Using default JWT_SECRET in production. Set a strong JWT_SECRET environment variable!');
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY, algorithm: 'HS256' }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Do NOT export JWT_SECRET — keep it internal to this module
module.exports = { generateToken, authenticate, requireAdmin };
