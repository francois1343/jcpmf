const db = require('../config/db')
const { cleanString, parseId, positiveInteger } = require('../utils/validation')

const exerciseTypes = new Set(['warmup', 'run', 'walk', 'sprint', 'stretching', 'cooldown', 'other'])

const resources = {
  seasons: {
    table: 'seasons',
    select: 'SELECT id, title, description, position FROM seasons ORDER BY position, id',
    columns: ['title', 'description', 'position'],
    values: (body) => [cleanString(body.title, 120), cleanString(body.description, 5000), positiveInteger(body.position)],
  },
  weeks: {
    table: 'weeks',
    select: `SELECT w.id, w.season_id AS seasonId, w.title, w.position, s.title AS seasonTitle
             FROM weeks w JOIN seasons s ON s.id = w.season_id ORDER BY s.position, w.position, w.id`,
    columns: ['season_id', 'title', 'position'],
    values: (body) => [parseId(body.seasonId), cleanString(body.title, 120), positiveInteger(body.position)],
  },
  sessions: {
    table: 'training_sessions',
    select: `SELECT ts.id, ts.week_id AS weekId, ts.title, ts.description, ts.position,
                    w.title AS weekTitle, s.title AS seasonTitle
             FROM training_sessions ts
             JOIN weeks w ON w.id = ts.week_id JOIN seasons s ON s.id = w.season_id
             ORDER BY s.position, w.position, ts.position, ts.id`,
    columns: ['week_id', 'title', 'description', 'position'],
    values: (body) => [parseId(body.weekId), cleanString(body.title, 120), cleanString(body.description, 5000), positiveInteger(body.position)],
  },
  exercises: {
    table: 'exercises',
    select: `SELECT e.id, e.training_session_id AS trainingSessionId, e.title, e.type,
                    e.duration_seconds AS durationSeconds, e.position, ts.title AS sessionTitle
             FROM exercises e JOIN training_sessions ts ON ts.id = e.training_session_id
             ORDER BY e.training_session_id, e.position, e.id`,
    columns: ['training_session_id', 'title', 'type', 'duration_seconds', 'position'],
    values: (body) => [
      parseId(body.trainingSessionId),
      cleanString(body.title, 120),
      exerciseTypes.has(body.type) ? body.type : null,
      positiveInteger(body.durationSeconds, -1),
      positiveInteger(body.position),
    ],
  },
}

function resourceFromRequest(req, res) {
  const resource = resources[req.params.resource]
  if (!resource) res.status(404).json({ message: 'Ressource CMS inconnue.' })
  return resource
}

function validateValues(resourceName, values) {
  if (values.some((value) => value === null || value === undefined)) return false
  const titleIndex = resourceName === 'seasons' ? 0 : 1
  if (!values[titleIndex]) return false
  return resourceName !== 'exercises' || values[3] >= 0
}

async function listContent(req, res, next) {
  try {
    const resource = resourceFromRequest(req, res)
    if (!resource) return
    const [rows] = await db.execute(resource.select)
    return res.json(rows)
  } catch (error) {
    return next(error)
  }
}

async function createContent(req, res, next) {
  try {
    const resource = resourceFromRequest(req, res)
    if (!resource) return
    const values = resource.values(req.body)
    if (!validateValues(req.params.resource, values)) {
      return res.status(400).json({ message: 'Les champs obligatoires sont invalides.' })
    }

    const placeholders = resource.columns.map(() => '?').join(', ')
    const [result] = await db.execute(
      `INSERT INTO ${resource.table} (${resource.columns.join(', ')}) VALUES (${placeholders})`,
      values,
    )
    return res.status(201).json({ id: result.insertId })
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'Le parent sélectionné n’existe pas.' })
    }
    return next(error)
  }
}

async function updateContent(req, res, next) {
  try {
    const resource = resourceFromRequest(req, res)
    const id = parseId(req.params.id)
    if (!resource) return
    if (!id) return res.status(400).json({ message: 'Identifiant invalide.' })

    const values = resource.values(req.body)
    if (!validateValues(req.params.resource, values)) {
      return res.status(400).json({ message: 'Les champs obligatoires sont invalides.' })
    }

    const assignments = resource.columns.map((column) => `${column} = ?`).join(', ')
    const [result] = await db.execute(
      `UPDATE ${resource.table} SET ${assignments} WHERE id = ?`,
      [...values, id],
    )
    if (!result.affectedRows) return res.status(404).json({ message: 'Élément introuvable.' })
    return res.status(204).send()
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'Le parent sélectionné n’existe pas.' })
    }
    return next(error)
  }
}

async function deleteContent(req, res, next) {
  try {
    const resource = resourceFromRequest(req, res)
    const id = parseId(req.params.id)
    if (!resource) return
    if (!id) return res.status(400).json({ message: 'Identifiant invalide.' })

    const [result] = await db.execute(`DELETE FROM ${resource.table} WHERE id = ?`, [id])
    if (!result.affectedRows) return res.status(404).json({ message: 'Élément introuvable.' })
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function listUsers(_req, res, next) {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.email, u.created_at AS createdAt,
              COUNT(p.id) AS startedSessions,
              COALESCE(SUM(p.status = 'completed'), 0) AS completedSessions,
              totals.totalSessions,
              CASE WHEN totals.totalSessions = 0 THEN 0
                   ELSE ROUND(COALESCE(SUM(p.status = 'completed'), 0) * 100 / totals.totalSessions)
              END AS progressPercent,
              MAX(p.updated_at) AS lastActivityAt
         FROM users u
         CROSS JOIN (SELECT COUNT(*) AS totalSessions FROM training_sessions) totals
         LEFT JOIN user_session_progress p ON p.user_id = u.id
        WHERE u.role = 'runner'
        GROUP BY u.id, totals.totalSessions
        ORDER BY u.created_at DESC`,
    )
    return res.json(users.map((user) => ({
      ...user,
      startedSessions: Number(user.startedSessions),
      completedSessions: Number(user.completedSessions),
      totalSessions: Number(user.totalSessions),
      progressPercent: Number(user.progressPercent),
    })))
  } catch (error) {
    return next(error)
  }
}

async function getUserProgress(req, res, next) {
  try {
    const userId = parseId(req.params.id)
    if (!userId) return res.status(400).json({ message: 'Identifiant invalide.' })
    const [users] = await db.execute(
      "SELECT id, username, email, created_at AS createdAt FROM users WHERE id = ? AND role = 'runner' LIMIT 1",
      [userId],
    )
    if (!users[0]) return res.status(404).json({ message: 'Coureur introuvable.' })

    const [progress] = await db.execute(
      `SELECT ts.id AS sessionId, se.title AS seasonTitle, w.title AS weekTitle, ts.title AS sessionTitle,
              COALESCE(p.status, 'not_started') AS status, p.distance_km AS distanceKm,
              p.steps_count AS stepsCount, p.completed_at AS completedAt
         FROM training_sessions ts
         JOIN weeks w ON w.id = ts.week_id JOIN seasons se ON se.id = w.season_id
         LEFT JOIN user_session_progress p ON p.training_session_id = ts.id AND p.user_id = ?
        ORDER BY se.position, w.position, ts.position, ts.id`,
      [userId],
    )
    return res.json({
      user: users[0],
      sessions: progress.map((item) => ({
        ...item,
        distanceKm: item.distanceKm === null ? null : Number(item.distanceKm),
      })),
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = { listContent, createContent, updateContent, deleteContent, listUsers, getUserProgress }
