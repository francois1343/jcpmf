const store = require('../../storage/json-store')
const { parseId, positiveInteger } = require('../../utils/validation')

function byPosition(left, right) {
  return left.position - right.position || left.id - right.id
}

function progressFor(data, userId, sessionId) {
  return data.progress.find((item) => item.userId === userId && item.trainingSessionId === sessionId)
}

function sessionView(data, session, userId) {
  const progress = progressFor(data, userId, session.id)
  const exercises = data.exercises
    .filter((exercise) => exercise.trainingSessionId === session.id)
    .sort(byPosition)
  return {
    ...session,
    exerciseCount: exercises.length,
    durationSeconds: exercises.reduce((total, exercise) => total + Number(exercise.durationSeconds), 0),
    status: progress?.status || 'not_started',
    currentExerciseIndex: progress?.currentExerciseIndex || 0,
    distanceKm: progress?.distanceKm ?? null,
    stepsCount: progress?.stepsCount ?? null,
    startedAt: progress?.startedAt ?? null,
    completedAt: progress?.completedAt ?? null,
    exercises,
  }
}

function buildPlan(data, userId) {
  const seasons = [...data.seasons].sort(byPosition).map((season) => {
    const weeks = data.weeks
      .filter((week) => week.seasonId === season.id)
      .sort(byPosition)
      .map((week) => {
        const sessions = data.sessions
          .filter((session) => session.weekId === week.id)
          .sort(byPosition)
          .map((session) => sessionView(data, session, userId))
        return {
          ...week,
          sessions,
          completedCount: sessions.filter((session) => session.status === 'completed').length,
        }
      })
    const seasonSessions = weeks.flatMap((week) => week.sessions)
    return {
      ...season,
      weeks,
      completedCount: seasonSessions.filter((session) => session.status === 'completed').length,
      sessionCount: seasonSessions.length,
    }
  })
  const sessions = seasons.flatMap((season) => season.weeks).flatMap((week) => week.sessions)
  return {
    seasons,
    progress: {
      completed: sessions.filter((session) => session.status === 'completed').length,
      total: sessions.length,
    },
  }
}

async function getPlan(req, res, next) {
  try {
    return res.json(buildPlan(await store.read(), Number(req.user.id)))
  } catch (error) {
    return next(error)
  }
}

async function getSession(req, res, next) {
  try {
    const sessionId = parseId(req.params.id)
    if (!sessionId) return res.status(400).json({ message: 'Identifiant de session invalide.' })
    const data = await store.read()
    const session = data.sessions.find((item) => item.id === sessionId)
    if (!session) return res.status(404).json({ message: 'Session introuvable.' })
    const week = data.weeks.find((item) => item.id === session.weekId)
    const season = data.seasons.find((item) => item.id === week?.seasonId)
    return res.json({
      ...sessionView(data, session, Number(req.user.id)),
      weekTitle: week?.title || '',
      seasonTitle: season?.title || '',
    })
  } catch (error) {
    return next(error)
  }
}

async function startSession(req, res, next) {
  try {
    const sessionId = parseId(req.params.id)
    if (!sessionId) return res.status(400).json({ message: 'Identifiant de session invalide.' })
    const userId = Number(req.user.id)
    const result = await store.update((data) => {
      if (!data.sessions.some((session) => session.id === sessionId)) return null
      const now = new Date().toISOString()
      let progress = progressFor(data, userId, sessionId)
      if (!progress) {
        progress = {
          id: store.nextId(data.progress), userId, trainingSessionId: sessionId,
          createdAt: now, updatedAt: now,
        }
        data.progress.push(progress)
      }
      Object.assign(progress, {
        status: 'in_progress', currentExerciseIndex: 0, distanceKm: null,
        stepsCount: null, startedAt: now, completedAt: null, updatedAt: now,
      })
      return { id: sessionId, status: progress.status, currentExerciseIndex: 0 }
    })
    if (!result) return res.status(404).json({ message: 'Session introuvable.' })
    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

async function updateSession(req, res, next) {
  try {
    const sessionId = parseId(req.params.id)
    const currentExerciseIndex = positiveInteger(req.body.currentExerciseIndex, -1)
    if (!sessionId || currentExerciseIndex < 0) {
      return res.status(400).json({ message: 'Progression invalide.' })
    }
    const updated = await store.update((data) => {
      const progress = data.progress.find((item) => (
        item.userId === Number(req.user.id)
        && item.trainingSessionId === sessionId
        && item.status === 'in_progress'
      ))
      if (!progress) return false
      progress.currentExerciseIndex = currentExerciseIndex
      progress.updatedAt = new Date().toISOString()
      return true
    })
    if (!updated) return res.status(404).json({ message: 'Session active introuvable.' })
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

async function completeSession(req, res, next) {
  try {
    const sessionId = parseId(req.params.id)
    const distanceKm = req.body.distanceKm === '' || req.body.distanceKm == null ? null : Number(req.body.distanceKm)
    const stepsCount = req.body.stepsCount === '' || req.body.stepsCount == null ? null : Number(req.body.stepsCount)
    const validDistance = distanceKm === null || (Number.isFinite(distanceKm) && distanceKm >= 0 && distanceKm <= 1000)
    const validSteps = stepsCount === null || (Number.isInteger(stepsCount) && stepsCount >= 0 && stepsCount <= 1000000)
    if (!sessionId || !validDistance || !validSteps || (distanceKm === null && stepsCount === null)) {
      return res.status(400).json({ message: 'Saisissez une distance et/ou un nombre de pas valide.' })
    }
    const completed = await store.update((data) => {
      const progress = data.progress.find((item) => (
        item.userId === Number(req.user.id)
        && item.trainingSessionId === sessionId
        && item.status === 'in_progress'
      ))
      if (!progress) return false
      const now = new Date().toISOString()
      Object.assign(progress, { status: 'completed', distanceKm, stepsCount, completedAt: now, updatedAt: now })
      return true
    })
    if (!completed) return res.status(404).json({ message: 'Session active introuvable.' })
    return res.json({ status: 'completed', distanceKm, stepsCount })
  } catch (error) {
    return next(error)
  }
}

async function resetProgress(req, res, next) {
  try {
    const scope = req.params.scope
    const id = scope === 'all' ? null : parseId(req.params.id)
    if (!['session', 'week', 'season', 'all'].includes(scope) || (scope !== 'all' && !id)) {
      return res.status(400).json({ message: 'Périmètre de réinitialisation invalide.' })
    }
    const userId = Number(req.user.id)
    const affectedRows = await store.update((data) => {
      const sessionIds = scope === 'week'
        ? data.sessions.filter((session) => session.weekId === id).map((session) => session.id)
        : scope === 'season'
          ? data.sessions.filter((session) => data.weeks.some((week) => week.id === session.weekId && week.seasonId === id)).map((session) => session.id)
          : scope === 'session' ? [id] : null
      const before = data.progress.length
      data.progress = data.progress.filter((progress) => (
        progress.userId !== userId || (sessionIds && !sessionIds.includes(progress.trainingSessionId))
      ))
      return before - data.progress.length
    })
    return res.json({ reset: true, affectedRows })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getPlan, getSession, startSession, updateSession, completeSession, resetProgress }
