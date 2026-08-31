const jwt = require('jsonwebtoken')

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentification requise.' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'jcpms-api',
    })
    return next()
  } catch {
    return res.status(401).json({ message: 'Jeton invalide ou expiré.' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Accès administrateur requis.' })
  }

  return next()
}

module.exports = { authenticate, requireAdmin }
