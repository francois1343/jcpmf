const C = (minutes) => ['run', minutes]
const M = (minutes) => ['walk', minutes, 'Marche']
const MT = (minutes) => ['walk', minutes, 'Marche / trot']

// Transcription des 36 cartes « Programme JCPMF 0 à 5 km » de courir.pdf.
// Chaque tableau décrit uniquement le corps de séance. L’échauffement E/S (10 min)
// et le retour au calme RC (5 min) sont ajoutés automatiquement par le générateur.
const cards = [
  // Semaine 1
  { week: 1, day: 1, expected: 15, steps: [C(.5), M(1), C(1), M(1), C(1.5), M(1.5), C(2), M(2), C(1.5), M(2), C(1)] },
  { week: 1, day: 2, expected: 18, steps: [C(1), M(1), C(1.5), M(1.5), C(2), M(2), C(2.5), M(2.5), C(2), M(1), C(1)] },
  { week: 1, day: 3, expected: 22.5, steps: [C(1), M(1), C(2), M(2), C(2.5), M(2.5), C(2.5), M(3), C(2.5), M(2.5), C(1)] },

  // Semaine 2
  { week: 2, day: 1, expected: 23, steps: [C(1), M(1), C(2), M(2), C(2.5), M(2.5), C(3), M(3), C(2.5), M(2.5), C(1)] },
  { week: 2, day: 2, expected: 19, steps: [C(1), M(1), C(2), M(1), C(3), M(2), C(3), M(2), C(2), M(1), C(1)] },
  { week: 2, day: 3, expected: 21, steps: [C(1), M(1), C(2), M(1), C(3), M(2), C(4), M(3), C(2), M(1), C(1)] },

  // Semaine 3
  { week: 3, day: 1, expected: 23, steps: [C(1), M(1), C(2), M(2), C(2.5), M(2.5), C(3), M(3), C(2.5), M(2.5), C(1)] },
  { week: 3, day: 2, expected: 21, steps: [C(1), M(1), C(2), M(1), C(3), M(2), C(4), M(3), C(2), M(1), C(1)] },
  { week: 3, day: 3, expected: 24, steps: [C(2), M(1), C(3), M(2), C(3), M(2), C(4), M(2), C(2), M(1), C(2)] },

  // Semaine 4
  { week: 4, day: 1, expected: 20.5, steps: [C(1), M(.5), C(2), M(1), C(3), M(1), C(4), M(2), C(3), M(1), C(2)] },
  { week: 4, day: 2, expected: 22, steps: [C(1), M(.5), C(2), M(.5), C(3), M(1), C(4), M(2), C(2), M(1), C(5)] },
  { week: 4, day: 3, expected: 24, steps: [C(2), M(.5), C(3), M(1), C(4), M(2), C(5), M(3), C(2), M(.5), C(1)] },

  // Semaine 5
  { week: 5, day: 1, expected: 26.5, steps: [C(2), M(.5), C(4), M(2), C(4), M(2), C(5), M(3), C(4)] },
  { week: 5, day: 2, expected: 30, steps: [C(3), M(1), C(4), M(2), C(5), M(3), C(5), M(3), C(4)] },
  { week: 5, day: 3, expected: 27, steps: [C(3), M(1), C(4), M(2), C(4), M(3), C(3), M(1), C(6)] },

  // Semaine 6
  { week: 6, day: 1, expected: 27, steps: [C(1), M(1), C(4), M(2), C(4), M(2), C(5), M(3), C(5)] },
  { week: 6, day: 2, expected: 29, steps: [C(1), M(1), C(4), M(2), C(5), M(3), C(6), M(3), C(4)] },
  { week: 6, day: 3, expected: 29, steps: [C(2), M(1), C(5), M(2), C(3), M(1), C(5), M(3), C(7)] },

  // Semaine 7 — les cartes passent de M (marche) à M/T (marche/trot).
  { week: 7, day: 1, expected: 32, steps: [C(3), MT(1), C(6), MT(3), C(7), MT(3), C(9)] },
  { week: 7, day: 2, expected: 33, steps: [C(3), MT(1), C(6), MT(3), C(8), MT(2), C(10)] },
  { week: 7, day: 3, expected: 39, steps: [C(5), M(3), C(4), M(2), C(5), M(2), C(5), M(3), C(10)] },

  // Semaine 8
  { week: 8, day: 1, expected: 35, steps: [C(4), MT(2), C(6), MT(2), C(8), MT(3), C(10)] },
  { week: 8, day: 2, expected: 37, steps: [C(6), MT(2), C(10), MT(3), C(4), MT(2), C(10)] },
  { week: 8, day: 3, expected: 37, steps: [C(6), MT(2), C(8), MT(2), C(8), MT(3), C(8)] },

  // Semaine 9
  { week: 9, day: 1, expected: 40, steps: [C(8), MT(1), C(8), MT(2), C(8), MT(3), C(10)] },
  { week: 9, day: 2, expected: 37, steps: [C(8), MT(2), C(4), MT(1), C(10), MT(2), C(10)] },
  { week: 9, day: 3, expected: 41, steps: [C(10), MT(2), C(4), MT(1), C(10), MT(2), C(12)] },

  // Semaine 10
  { week: 10, day: 1, expected: 40, steps: [C(12), MT(2), C(10), MT(2), C(14)] },
  { week: 10, day: 2, expected: 40, steps: [C(12), MT(2), C(10), MT(2), C(14)] },
  { week: 10, day: 3, expected: 39, steps: [C(12), MT(1), C(10), MT(2), C(14)] },

  // Semaine 11
  { week: 11, day: 1, expected: 38, steps: [C(16), MT(1), C(4), MT(1), C(16)] },
  { week: 11, day: 2, expected: 39, steps: [C(14), MT(1), C(4), MT(2), C(18)] },
  { week: 11, day: 3, expected: 37, steps: [C(16), MT(3), C(18)] },

  // Semaine 12
  { week: 12, day: 1, expected: 37, steps: [C(10), MT(2), C(25)] },
  { week: 12, day: 2, expected: 37, steps: [C(5), MT(2), C(30)] },
  { week: 12, day: 3, expected: 40, steps: [C(40)] },
]

module.exports = { cards }
