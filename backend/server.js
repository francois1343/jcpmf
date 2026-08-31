require('dotenv').config()

const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const apiRoutes = require('./routes/api')

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères.')
}

const app = express()
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origine CORS refusée.'))
  },
}))
app.use(express.json({ limit: '100kb' }))
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api', apiRoutes)

app.use((_req, res) => res.status(404).json({ message: 'Route introuvable.' }))
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Erreur interne du serveur.' })
})

const port = Number(process.env.PORT || 4000)
app.listen(port, (error) => {
  if (error) {
    console.error(`Impossible de démarrer l’API : ${error.message}`)
    process.exitCode = 1
    return
  }
  console.log(`API JCPMS disponible sur le port ${port}`)
})

module.exports = app
