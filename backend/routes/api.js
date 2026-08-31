const express = require('express')
const rateLimit = require('express-rate-limit')
const useJsonStore = (process.env.DATA_STORE || 'json').toLowerCase() !== 'mysql'
const auth = require(useJsonStore ? '../controllers/json/auth.controller' : '../controllers/auth.controller')
const admin = require(useJsonStore ? '../controllers/json/admin.controller' : '../controllers/admin.controller')
const runner = require(useJsonStore ? '../controllers/json/runner.controller' : '../controllers/runner.controller')
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware')

const router = express.Router()
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
})

router.post('/auth/register', authLimiter, auth.register)
router.post('/auth/login', authLimiter, auth.login)
router.get('/auth/me', authenticate, auth.me)

router.get('/runner/plan', authenticate, runner.getPlan)
router.get('/runner/sessions/:id', authenticate, runner.getSession)
router.put('/runner/sessions/:id/start', authenticate, runner.startSession)
router.patch('/runner/sessions/:id/progress', authenticate, runner.updateSession)
router.put('/runner/sessions/:id/complete', authenticate, runner.completeSession)
router.delete('/runner/progress/:scope', authenticate, runner.resetProgress)
router.delete('/runner/progress/:scope/:id', authenticate, runner.resetProgress)

router.get('/admin/users', authenticate, requireAdmin, admin.listUsers)
router.get('/admin/users/:id/progress', authenticate, requireAdmin, admin.getUserProgress)
router.get('/admin/content/:resource', authenticate, requireAdmin, admin.listContent)
router.post('/admin/content/:resource', authenticate, requireAdmin, admin.createContent)
router.put('/admin/content/:resource/:id', authenticate, requireAdmin, admin.updateContent)
router.delete('/admin/content/:resource/:id', authenticate, requireAdmin, admin.deleteContent)

module.exports = router
