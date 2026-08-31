const fs = require('fs')
const path = require('path')
const { cards } = require('../database/season1-program')

const dataPath = path.join(__dirname, '..', 'database', 'data.json')
const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

if (cards.length !== 36) throw new Error(`36 cartes attendues, ${cards.length} reçues.`)

const weeks = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  seasonId: 1,
  title: `Semaine ${index + 1}`,
  position: index + 1,
}))

const sessions = []
const exercises = []
let exerciseId = 1

for (const [cardIndex, card] of cards.entries()) {
  const sessionId = cardIndex + 1
  const workMinutes = card.steps.reduce((total, [, minutes]) => total + minutes, 0)
  if (workMinutes !== card.expected) {
    throw new Error(`Semaine ${card.week}, jour ${card.day}: ${card.expected} min attendues, ${workMinutes} calculées.`)
  }

  sessions.push({
    id: sessionId,
    weekId: card.week,
    title: `Jour ${card.day}`,
    description: `Carte JCPMF 0 à 5 km — semaine ${card.week}, jour ${card.day}. ${card.expected} min d’alternance, précédées de 10 min d’échauffement et suivies de 5 min de retour au calme.`,
    position: card.day,
  })

  const sessionExercises = [
    ['warmup', 10, 'Échauffement et souplesse'],
    ...card.steps.map(([type, minutes, title]) => [type, minutes, title || 'Course']),
    ['stretching', 5, 'Retour au calme'],
  ]

  sessionExercises.forEach(([type, minutes, title], position) => {
    exercises.push({
      id: exerciseId++,
      trainingSessionId: sessionId,
      title,
      type,
      durationSeconds: Math.round(minutes * 60),
      position: position + 1,
    })
  })
}

const validSessionIds = new Set(sessions.map(({ id }) => id))
const progress = (currentData.progress || []).filter(({ trainingSessionId }) => validSessionIds.has(trainingSessionId))

const data = {
  ...currentData,
  seasons: [{
    id: 1,
    title: 'Saison 1 — De 0 à 5 km',
    description: 'Le programme officiel JCPMF en 12 semaines et 36 séances progressives.',
    position: 1,
  }],
  weeks,
  sessions,
  exercises,
  progress,
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log(`Saison 1 générée : ${weeks.length} semaines, ${sessions.length} séances, ${exercises.length} exercices.`)
