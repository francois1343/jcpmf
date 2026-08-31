const store = require('../../storage/json-store')
const { cleanString, parseId, positiveInteger } = require('../../utils/validation')

const exerciseTypes = new Set(['warmup', 'run', 'walk', 'sprint', 'stretching', 'cooldown', 'other'])

function byPosition(left, right) {
  return left.position - right.position || left.id - right.id
}

function contentRows(data, resource) {
  if (resource === 'seasons') return [...data.seasons].sort(byPosition)
  if (resource === 'weeks') {
    return [...data.weeks].sort((left, right) => {
      const leftSeason = data.seasons.find((season) => season.id === left.seasonId)
      const rightSeason = data.seasons.find((season) => season.id === right.seasonId)
      return byPosition(leftSeason, rightSeason) || byPosition(left, right)
    }).map((week) => ({
      ...week,
      seasonTitle: data.seasons.find((season) => season.id === week.seasonId)?.title || '',
    }))
  }
  if (resource === 'sessions') {
    return [...data.sessions].sort((left, right) => {
      const leftWeek = data.weeks.find((week) => week.id === left.weekId)
      const rightWeek = data.weeks.find((week) => week.id === right.weekId)
      const leftSeason = data.seasons.find((season) => season.id === leftWeek?.seasonId)
      const rightSeason = data.seasons.find((season) => season.id === rightWeek?.seasonId)
      return byPosition(leftSeason, rightSeason) || byPosition(leftWeek, rightWeek) || byPosition(left, right)
    }).map((session) => {
      const week = data.weeks.find((item) => item.id === session.weekId)
      return {
        ...session,
        weekTitle: week?.title || '',
        seasonTitle: data.seasons.find((season) => season.id === week?.seasonId)?.title || '',
      }
    })
  }
  if (resource === 'exercises') {
    return [...data.exercises]
      .sort((left, right) => left.trainingSessionId - right.trainingSessionId || byPosition(left, right))
      .map((exercise) => ({
        ...exercise,
        sessionTitle: data.sessions.find((session) => session.id === exercise.trainingSessionId)?.title || '',
      }))
  }
  return null
}

function valuesFor(resource, body) {
  if (resource === 'seasons') {
    return {
      title: cleanString(body.title, 120), description: cleanString(body.description, 5000),
      position: positiveInteger(body.position),
    }
  }
  if (resource === 'weeks') {
    return { seasonId: parseId(body.seasonId), title: cleanString(body.title, 120), position: positiveInteger(body.position) }
  }
  if (resource === 'sessions') {
    return {
      weekId: parseId(body.weekId), title: cleanString(body.title, 120),
      description: cleanString(body.description, 5000), position: positiveInteger(body.position),
    }
  }
  if (resource === 'exercises') {
    return {
      trainingSessionId: parseId(body.trainingSessionId), title: cleanString(body.title, 120),
      type: exerciseTypes.has(body.type) ? body.type : null,
      durationSeconds: positiveInteger(body.durationSeconds, -1), position: positiveInteger(body.position),
    }
  }
  return null
}

function collectionName(resource) {
  return resource === 'sessions' ? 'sessions' : resource
}

function isValid(resource, values, data) {
  if (!values || !values.title || values.position === null) return false
  if (resource === 'weeks') return data.seasons.some((item) => item.id === values.seasonId)
  if (resource === 'sessions') return data.weeks.some((item) => item.id === values.weekId)
  if (resource === 'exercises') {
    return values.durationSeconds >= 0 && values.type
      && data.sessions.some((item) => item.id === values.trainingSessionId)
  }
  return true
}

async function listContent(req, res, next) {
  try {
    const rows = contentRows(await store.read(), req.params.resource)
    if (!rows) return res.status(404).json({ message: 'Ressource CMS inconnue.' })
    return res.json(rows)
  } catch (error) {
    return next(error)
  }
}

async function createContent(req, res, next) {
  try {
    const resource = req.params.resource
    const created = await store.update((data) => {
      const collection = data[collectionName(resource)]
      const values = valuesFor(resource, req.body)
      if (!collection || !isValid(resource, values, data)) return null
      const item = { id: store.nextId(collection), ...values }
      collection.push(item)
      return item
    })
    if (!created) return res.status(400).json({ message: 'Les champs obligatoires ou le parent sont invalides.' })
    return res.status(201).json({ id: created.id })
  } catch (error) {
    return next(error)
  }
}

async function updateContent(req, res, next) {
  try {
    const resource = req.params.resource
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: 'Identifiant invalide.' })
    const result = await store.update((data) => {
      const collection = data[collectionName(resource)]
      const values = valuesFor(resource, req.body)
      if (!collection || !isValid(resource, values, data)) return 'invalid'
      const item = collection.find((entry) => entry.id === id)
      if (!item) return 'missing'
      Object.assign(item, values)
      return 'updated'
    })
    if (result === 'invalid') return res.status(400).json({ message: 'Les champs obligatoires ou le parent sont invalides.' })
    if (result === 'missing') return res.status(404).json({ message: 'Élément introuvable.' })
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

function cascadeDelete(data, resource, id) {
  if (resource === 'seasons') {
    const weekIds = data.weeks.filter((week) => week.seasonId === id).map((week) => week.id)
    const sessionIds = data.sessions.filter((session) => weekIds.includes(session.weekId)).map((session) => session.id)
    data.seasons = data.seasons.filter((item) => item.id !== id)
    data.weeks = data.weeks.filter((item) => !weekIds.includes(item.id))
    data.sessions = data.sessions.filter((item) => !sessionIds.includes(item.id))
    data.exercises = data.exercises.filter((item) => !sessionIds.includes(item.trainingSessionId))
    data.progress = data.progress.filter((item) => !sessionIds.includes(item.trainingSessionId))
    return
  }
  if (resource === 'weeks') {
    const sessionIds = data.sessions.filter((session) => session.weekId === id).map((session) => session.id)
    data.weeks = data.weeks.filter((item) => item.id !== id)
    data.sessions = data.sessions.filter((item) => !sessionIds.includes(item.id))
    data.exercises = data.exercises.filter((item) => !sessionIds.includes(item.trainingSessionId))
    data.progress = data.progress.filter((item) => !sessionIds.includes(item.trainingSessionId))
    return
  }
  if (resource === 'sessions') {
    data.sessions = data.sessions.filter((item) => item.id !== id)
    data.exercises = data.exercises.filter((item) => item.trainingSessionId !== id)
    data.progress = data.progress.filter((item) => item.trainingSessionId !== id)
    return
  }
  data.exercises = data.exercises.filter((item) => item.id !== id)
}

async function deleteContent(req, res, next) {
  try {
    const resource = req.params.resource
    const id = parseId(req.params.id)
    const collection = collectionName(resource)
    if (!['seasons', 'weeks', 'sessions', 'exercises'].includes(resource)) {
      return res.status(404).json({ message: 'Ressource CMS inconnue.' })
    }
    if (!id) return res.status(400).json({ message: 'Identifiant invalide.' })
    const deleted = await store.update((data) => {
      if (!data[collection].some((item) => item.id === id)) return false
      cascadeDelete(data, resource, id)
      return true
    })
    if (!deleted) return res.status(404).json({ message: 'Élément introuvable.' })
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function listUsers(_req, res, next) {
  try {
    const data = await store.read()
    const totalSessions = data.sessions.length
    const users = data.users.filter((user) => user.role === 'runner').map((user) => {
      const progress = data.progress.filter((item) => item.userId === user.id)
      const completedSessions = progress.filter((item) => item.status === 'completed').length
      return {
        id: user.id, username: user.username, email: user.email, createdAt: user.createdAt,
        startedSessions: progress.length, completedSessions, totalSessions,
        progressPercent: totalSessions ? Math.round(completedSessions * 100 / totalSessions) : 0,
        lastActivityAt: progress.map((item) => item.updatedAt).filter(Boolean).sort().at(-1) || null,
      }
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    return res.json(users)
  } catch (error) {
    return next(error)
  }
}

async function getUserProgress(req, res, next) {
  try {
    const userId = parseId(req.params.id)
    if (!userId) return res.status(400).json({ message: 'Identifiant invalide.' })
    const data = await store.read()
    const user = data.users.find((item) => item.id === userId && item.role === 'runner')
    if (!user) return res.status(404).json({ message: 'Coureur introuvable.' })
    const sessions = contentRows(data, 'sessions').map((session) => {
      const progress = data.progress.find((item) => item.userId === userId && item.trainingSessionId === session.id)
      return {
        sessionId: session.id, seasonTitle: session.seasonTitle, weekTitle: session.weekTitle,
        sessionTitle: session.title, status: progress?.status || 'not_started',
        distanceKm: progress?.distanceKm ?? null, stepsCount: progress?.stepsCount ?? null,
        completedAt: progress?.completedAt ?? null,
      }
    })
    return res.json({ user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt }, sessions })
  } catch (error) {
    return next(error)
  }
}

module.exports = { listContent, createContent, updateContent, deleteContent, listUsers, getUserProgress }
