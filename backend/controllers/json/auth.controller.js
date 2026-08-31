const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const store = require('../../storage/json-store')
const { cleanString, isEmail } = require('../../utils/validation')

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

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await store.update((data) => {
      const exists = data.users.some((item) => (
        item.email.toLowerCase() === email || item.username.toLowerCase() === username.toLowerCase()
      ))
      if (exists) return null

      const now = new Date().toISOString()
      const created = {
        id: store.nextId(data.users), username, email, passwordHash, role: 'runner', createdAt: now, updatedAt: now,
      }
      data.users.push(created)
      return created
    })

    if (!user) return res.status(409).json({ message: 'Cet e-mail ou ce nom d’utilisateur existe déjà.' })
    return res.status(201).json({ token: issueToken(user), user: publicUser(user) })
  } catch (error) {
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

    const data = await store.read()
    const user = data.users.find((item) => (
      item.email.toLowerCase() === identifier || item.username.toLowerCase() === identifier
    ))
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Identifiants incorrects.' })
    }
    return res.json({ token: issueToken(user), user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
}

async function me(req, res, next) {
  try {
    const data = await store.read()
    const user = data.users.find((item) => item.id === Number(req.user.id))
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })
    return res.json(publicUser(user))
  } catch (error) {
    return next(error)
  }
}

module.exports = { register, login, me }
