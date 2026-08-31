const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../config/db')
const { cleanString, isEmail } = require('../utils/validation')

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email, role: user.role }
}

function issueToken(user) {
  return jwt.sign(publicUser(user), process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    issuer: 'jcpms-api',
  })
}

async function register(req, res, next) {
  try {
    const username = cleanString(req.body.username, 50)
    const email = cleanString(req.body.email, 190).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''

    if (username.length < 3 || !isEmail(email) || password.length < 10) {
      return res.status(400).json({
        message: 'Nom d’utilisateur (3 caractères), e-mail valide et mot de passe (10 caractères) requis.',
      })
    }

    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email, username],
    )
    if (existing.length) {
      return res.status(409).json({ message: 'Cet e-mail ou ce nom d’utilisateur existe déjà.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await db.execute(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'runner')",
      [username, email, passwordHash],
    )
    const user = { id: result.insertId, username, email, role: 'runner' }
    return res.status(201).json({ token: issueToken(user), user })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cet e-mail ou ce nom d’utilisateur existe déjà.' })
    }
    return next(error)
  }
}

async function login(req, res, next) {
  try {
    const identifier = cleanString(req.body.identifier || req.body.email, 190).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifiant et mot de passe requis.' })
    }

    const [users] = await db.execute(
      'SELECT id, username, email, password_hash, role FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1',
      [identifier, identifier],
    )
    const user = users[0]

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Identifiants incorrects.' })
    }

    return res.json({ token: issueToken(user), user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
}

async function me(req, res, next) {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, role FROM users WHERE id = ? LIMIT 1',
      [req.user.id],
    )
    if (!users[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' })
    return res.json(users[0])
  } catch (error) {
    return next(error)
  }
}

module.exports = { register, login, me }
