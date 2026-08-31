function cleanString(value, maxLength = 255) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function positiveInteger(value, fallback = 1) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

module.exports = { cleanString, positiveInteger, isEmail, parseId }
