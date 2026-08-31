const DATABASE_NAME = 'jcpmf-offline'
const DATABASE_VERSION = 1
const CACHE_STORE = 'cache'
const QUEUE_STORE = 'queue'

let databasePromise
let syncPromise

function openDatabase() {
  if (!import.meta.client || !('indexedDB' in window)) return Promise.resolve(null)
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        const queue = database.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
        queue.createIndex('scope', 'scope', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return databasePromise
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getRecord(storeName, key) {
  const database = await openDatabase()
  if (!database) return null
  const transaction = database.transaction(storeName, 'readonly')
  return requestResult(transaction.objectStore(storeName).get(key))
}

async function putRecord(storeName, value) {
  const database = await openDatabase()
  if (!database) return null
  const transaction = database.transaction(storeName, 'readwrite')
  return requestResult(transaction.objectStore(storeName).put(value))
}

async function deleteRecord(storeName, key) {
  const database = await openDatabase()
  if (!database) return
  const transaction = database.transaction(storeName, 'readwrite')
  await requestResult(transaction.objectStore(storeName).delete(key))
}

async function recordsForScope(scope) {
  const database = await openDatabase()
  if (!database) return []
  const transaction = database.transaction(QUEUE_STORE, 'readonly')
  const index = transaction.objectStore(QUEUE_STORE).index('scope')
  return requestResult(index.getAll(scope))
}

function cacheKey(scope, path) {
  return `${scope}:${path}`
}

function sessionFromPlan(plan, sessionId) {
  for (const season of plan?.seasons || []) {
    for (const week of season.weeks || []) {
      const session = week.sessions?.find((item) => Number(item.id) === Number(sessionId))
      if (session) return { season, week, session }
    }
  }
  return null
}

function recountPlan(plan) {
  let completed = 0
  let total = 0
  for (const season of plan?.seasons || []) {
    const seasonSessions = []
    for (const week of season.weeks || []) {
      week.completedCount = (week.sessions || []).filter((session) => session.status === 'completed').length
      seasonSessions.push(...(week.sessions || []))
    }
    season.completedCount = seasonSessions.filter((session) => session.status === 'completed').length
    season.sessionCount = seasonSessions.length
    completed += season.completedCount
    total += season.sessionCount
  }
  plan.progress = { completed, total }
}

function resetSession(session) {
  Object.assign(session, {
    status: 'not_started', currentExerciseIndex: 0,
    distanceKm: null, stepsCount: null, startedAt: null, completedAt: null,
  })
}

function applyToPlan(plan, path, body) {
  const startMatch = path.match(/^\/runner\/sessions\/(\d+)\/start$/)
  const progressMatch = path.match(/^\/runner\/sessions\/(\d+)\/progress$/)
  const completeMatch = path.match(/^\/runner\/sessions\/(\d+)\/complete$/)
  const resetMatch = path.match(/^\/runner\/progress\/(session|week|season)\/(\d+)$/)

  if (startMatch) {
    const found = sessionFromPlan(plan, startMatch[1])
    if (found) Object.assign(found.session, { status: 'in_progress', currentExerciseIndex: 0, distanceKm: null, stepsCount: null })
  } else if (progressMatch) {
    const found = sessionFromPlan(plan, progressMatch[1])
    if (found) found.session.currentExerciseIndex = Number(body?.currentExerciseIndex || 0)
  } else if (completeMatch) {
    const found = sessionFromPlan(plan, completeMatch[1])
    if (found) Object.assign(found.session, {
      status: 'completed', distanceKm: Number(body?.distanceKm || 0), stepsCount: Number(body?.stepsCount || 0),
    })
  } else if (resetMatch) {
    const [, scope, id] = resetMatch
    for (const season of plan?.seasons || []) {
      for (const week of season.weeks || []) {
        for (const session of week.sessions || []) {
          if ((scope === 'session' && Number(session.id) === Number(id))
            || (scope === 'week' && Number(week.id) === Number(id))
            || (scope === 'season' && Number(season.id) === Number(id))) resetSession(session)
        }
      }
    }
  } else if (path === '/runner/progress/all') {
    for (const season of plan?.seasons || []) {
      for (const week of season.weeks || []) {
        for (const session of week.sessions || []) resetSession(session)
      }
    }
  }
  recountPlan(plan)
}

function syntheticResponse(path, body) {
  const sessionId = Number(path.match(/^\/runner\/sessions\/(\d+)/)?.[1])
  if (path.endsWith('/start')) return { id: sessionId, status: 'in_progress', currentExerciseIndex: 0, offline: true }
  if (path.endsWith('/complete')) return { status: 'completed', distanceKm: body?.distanceKm ?? 0, stepsCount: body?.stepsCount ?? 0, offline: true }
  if (path.startsWith('/runner/progress/')) return { reset: true, affectedRows: 0, offline: true }
  return { offline: true }
}

export function offlineScopeFromToken(token) {
  if (!token) return 'anonymous'
  try {
    const encoded = token.split('.')[1]
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json = import.meta.client
      ? decodeURIComponent(atob(padded).split('').map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))
      : Buffer.from(encoded, 'base64url').toString('utf8')
    return `user-${JSON.parse(json).id}`
  } catch {
    return 'anonymous'
  }
}

export function useOfflineStore() {
  const isOnline = useState('offline-is-online', () => import.meta.client ? navigator.onLine : true)
  const pendingCount = useState('offline-pending-count', () => 0)
  const lastSyncAt = useState('offline-last-sync-at', () => null)

  async function getCached(scope, path) {
    const record = await getRecord(CACHE_STORE, cacheKey(scope, path))
    return record?.value ?? null
  }

  async function setCached(scope, path, value) {
    if (!import.meta.client) return value
    await putRecord(CACHE_STORE, { key: cacheKey(scope, path), value, updatedAt: new Date().toISOString() })
    if (path === '/runner/plan') {
      for (const season of value?.seasons || []) {
        for (const week of season.weeks || []) {
          for (const session of week.sessions || []) {
            await putRecord(CACHE_STORE, {
              key: cacheKey(scope, `/runner/sessions/${session.id}`),
              value: { ...session, seasonTitle: season.title, weekTitle: week.title },
              updatedAt: new Date().toISOString(),
            })
          }
        }
      }
    }
    return value
  }

  async function refreshPendingCount(scope) {
    pendingCount.value = (await recordsForScope(scope)).length
    return pendingCount.value
  }

  async function applyOptimisticMutation(scope, path, body) {
    const plan = await getCached(scope, '/runner/plan')
    if (plan) {
      applyToPlan(plan, path, body)
      await setCached(scope, '/runner/plan', plan)
    }

    const sessionId = path.match(/^\/runner\/sessions\/(\d+)/)?.[1]
    if (sessionId) {
      const sessionPath = `/runner/sessions/${sessionId}`
      const session = await getCached(scope, sessionPath)
      if (session) {
        const wrapper = { seasons: [{ weeks: [{ sessions: [session] }] }] }
        applyToPlan(wrapper, path, body)
        await setCached(scope, sessionPath, session)
      }
    }
  }

  async function enqueue(scope, path, options) {
    await putRecord(QUEUE_STORE, {
      scope, path, method: String(options.method || 'GET').toUpperCase(),
      body: options.body == null ? null : JSON.parse(JSON.stringify(options.body)),
      createdAt: new Date().toISOString(),
    })
    await applyOptimisticMutation(scope, path, options.body)
    await refreshPendingCount(scope)
    return syntheticResponse(path, options.body)
  }

  async function syncPending(scope, token, baseURL) {
    if (!import.meta.client || !navigator.onLine || !token || syncPromise) return syncPromise
    syncPromise = (async () => {
      const records = (await recordsForScope(scope)).sort((left, right) => left.id - right.id)
      for (const record of records) {
        try {
          await $fetch(record.path, {
            baseURL, method: record.method, body: record.body,
            headers: { Authorization: `Bearer ${token}` },
          })
          await deleteRecord(QUEUE_STORE, record.id)
        } catch (error) {
          const status = error?.statusCode || error?.status
          if (status && status >= 400 && status < 500 && status !== 401) {
            await deleteRecord(QUEUE_STORE, record.id)
            continue
          }
          break
        }
      }
      await refreshPendingCount(scope)
      if (!pendingCount.value) {
        try {
          const plan = await $fetch('/runner/plan', {
            baseURL, headers: { Authorization: `Bearer ${token}` },
          })
          await setCached(scope, '/runner/plan', plan)
          lastSyncAt.value = new Date().toISOString()
        } catch {
          // La synchronisation sera retentée au prochain retour du réseau.
        }
      }
    })().finally(() => { syncPromise = null })
    return syncPromise
  }

  async function request(scope, path, options, token, baseURL) {
    const method = String(options.method || 'GET').toUpperCase()
    const cacheable = method === 'GET' && (path.startsWith('/runner/') || path === '/auth/me')
    const queueable = method !== 'GET' && path.startsWith('/runner/')

    if (import.meta.client && queueable && !navigator.onLine) return enqueue(scope, path, options)
    if (import.meta.client && queueable && pendingCount.value) {
      await syncPending(scope, token, baseURL)
      if (pendingCount.value) return enqueue(scope, path, options)
    }

    try {
      const response = await $fetch(path, {
        baseURL, ...options,
        headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (import.meta.client && cacheable) await setCached(scope, path, response)
      if (import.meta.client && queueable) await applyOptimisticMutation(scope, path, options.body)
      return response
    } catch (error) {
      const status = error?.statusCode || error?.status
      const networkFailure = import.meta.client && (!navigator.onLine || !status)
      if (networkFailure && cacheable) {
        const cached = await getCached(scope, path)
        if (cached !== null) return cached
      }
      if (networkFailure && queueable) return enqueue(scope, path, options)
      throw error
    }
  }

  return {
    isOnline, pendingCount, lastSyncAt, getCached, setCached,
    refreshPendingCount, syncPending, request,
  }
}
