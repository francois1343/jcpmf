const db = require('../config/db')
const { parseId, positiveInteger } = require('../utils/validation')

async function getPlan(req, res, next) {
  try {
    const [seasons, weeks, sessions, exercises] = await Promise.all([
      db.execute('SELECT id, title, description, position FROM seasons ORDER BY position, id'),
      db.execute('SELECT id, season_id AS seasonId, title, position FROM weeks ORDER BY position, id'),
      db.execute(
        `SELECT s.id, s.week_id AS weekId, s.title, s.description, s.position,
                COUNT(e.id) AS exerciseCount,
                COALESCE(SUM(e.duration_seconds), 0) AS durationSeconds,
                COALESCE(p.status, 'not_started') AS status,
                COALESCE(p.current_exercise_index, 0) AS currentExerciseIndex,
                p.distance_km AS distanceKm, p.steps_count AS stepsCount
           FROM training_sessions s
           LEFT JOIN exercises e ON e.training_session_id = s.id
           LEFT JOIN user_session_progress p ON p.training_session_id = s.id AND p.user_id = ?
          GROUP BY s.id, p.id
          ORDER BY s.position, s.id`,
        [req.user.id],
      ),
      db.execute(
        'SELECT id, training_session_id AS trainingSessionId, title, type, duration_seconds AS durationSeconds, position FROM exercises ORDER BY position, id',
      ),
    ])

    const sessionsByWeek = new Map()
    const exercisesBySession = new Map()
    for (const exercise of exercises[0]) {
      const collection = exercisesBySession.get(exercise.trainingSessionId) || []
      collection.push(exercise)
      exercisesBySession.set(exercise.trainingSessionId, collection)
    }
    for (const session of sessions[0]) {
      session.exerciseCount = Number(session.exerciseCount)
      session.durationSeconds = Number(session.durationSeconds)
      session.distanceKm = session.distanceKm === null ? null : Number(session.distanceKm)
      session.exercises = exercisesBySession.get(session.id) || []
      const collection = sessionsByWeek.get(session.weekId) || []
      collection.push(session)
      sessionsByWeek.set(session.weekId, collection)
    }

    const weeksBySeason = new Map()
    for (const week of weeks[0]) {
      week.sessions = sessionsByWeek.get(week.id) || []
      week.completedCount = week.sessions.filter((session) => session.status === 'completed').length
      const collection = weeksBySeason.get(week.seasonId) || []
      collection.push(week)
      weeksBySeason.set(week.seasonId, collection)
    }

    const plan = seasons[0].map((season) => {
      season.weeks = weeksBySeason.get(season.id) || []
      const seasonSessions = season.weeks.flatMap((week) => week.sessions)
      season.completedCount = seasonSessions.filter((session) => session.status === 'completed').length
      season.sessionCount = seasonSessions.length
      return season
    })

    const allSessions = plan.flatMap((season) => season.weeks).flatMap((week) => week.sessions)
    return res.json({
      seasons: plan,
      progress: {
        completed: allSessions.filter((session) => session.status === 'completed').length,
        total: allSessions.length,
      },
    })
  } catch (error) {
    return next(error)
  }
}

async function getSession(req, res, next) {
  try {
    const sessionId = parseId(req.params.id)
    if (!sessionId) return res.status(400).json({ message: 'Identifiant de session invalide.' })

    const [sessions] = await db.execute(
      `SELECT s.id, s.title, s.description, s.position, w.title AS weekTitle, se.title AS seasonTitle,
              COALESCE(p.status, 'not_started') AS status,
              COALESCE(p.current_exercise_index, 0) AS currentExerciseIndex,
              p.distance_km AS distanceKm, p.steps_count AS stepsCount, p.started_at AS startedAt,
              p.completed_at AS completedAt
         FROM training_sessions s
         JOIN weeks w ON w.id = s.week_id
         JOIN seasons se ON se.id = w.season_id
         LEFT JOIN user_session_progress p ON p.training_session_id = s.id AND p.user_id = ?
        WHERE s.id = ? LIMIT 1`,
      [req.user.id, sessionId],
    )
    if (!sessions[0]) return res.status(404).json({ message: 'Session introuvable.' })

    const [exercises] = await db.execute(
      'SELECT id, title, type, duration_seconds AS durationSeconds, position FROM exercises WHERE training_session_id = ? ORDER BY position, id',
      [sessionId],
    )
    const session = sessions[0]
    session.distanceKm = session.distanceKm === null ? null : Number(session.distanceKm)
    session.exercises = exercises
    session.durationSeconds = exercises.reduce((sum, exercise) => sum + exercise.durationSeconds, 0)
    return res.json(session)
  } catch (error) {
    return next(error)
  }
}

async function startSession(req, res, next) {
  try {
    const sessionId = parseId(req.params.id)
    if (!sessionId) return res.status(400).json({ message: 'Identifiant de session invalide.' })

    const [sessions] = await db.execute('SELECT id FROM training_sessions WHERE id = ? LIMIT 1', [sessionId])
    if (!sessions[0]) return res.status(404).json({ message: 'Session introuvable.' })

    await db.execute(
      `INSERT INTO user_session_progress
         (user_id, training_session_id, status, current_exercise_index, started_at)
       VALUES (?, ?, 'in_progress', 0, NOW())
       ON DUPLICATE KEY UPDATE
         status = 'in_progress', current_exercise_index = 0, distance_km = NULL,
         steps_count = NULL, started_at = NOW(), completed_at = NULL`,
      [req.user.id, sessionId],
    )
    return res.json({ id: sessionId, status: 'in_progress', currentExerciseIndex: 0 })
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

    const [result] = await db.execute(
      `UPDATE user_session_progress
          SET current_exercise_index = ?
        WHERE user_id = ? AND training_session_id = ? AND status = 'in_progress'`,
      [currentExerciseIndex, req.user.id, sessionId],
    )
    if (!result.affectedRows) return res.status(404).json({ message: 'Session active introuvable.' })
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

    const [result] = await db.execute(
      `UPDATE user_session_progress
          SET status = 'completed', distance_km = ?, steps_count = ?, completed_at = NOW()
        WHERE user_id = ? AND training_session_id = ? AND status = 'in_progress'`,
      [distanceKm, stepsCount, req.user.id, sessionId],
    )
    if (!result.affectedRows) return res.status(404).json({ message: 'Session active introuvable.' })
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

    const queries = {
      session: 'DELETE FROM user_session_progress WHERE user_id = ? AND training_session_id = ?',
      week: `DELETE p FROM user_session_progress p
             JOIN training_sessions s ON s.id = p.training_session_id
             WHERE p.user_id = ? AND s.week_id = ?`,
      season: `DELETE p FROM user_session_progress p
               JOIN training_sessions s ON s.id = p.training_session_id
               JOIN weeks w ON w.id = s.week_id
               WHERE p.user_id = ? AND w.season_id = ?`,
      all: 'DELETE FROM user_session_progress WHERE user_id = ?',
    }
    const params = scope === 'all' ? [req.user.id] : [req.user.id, id]
    const [result] = await db.execute(queries[scope], params)
    return res.json({ reset: true, affectedRows: result.affectedRows })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getPlan, getSession, startSession, updateSession, completeSession, resetProgress }
