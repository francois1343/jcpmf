const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const seedData = require('../database/data.json')

const configuredPath = process.env.JSON_DATA_PATH
const dataPath = configuredPath
  ? path.resolve(configuredPath)
  : process.env.VERCEL
    ? path.join(os.tmpdir(), 'jcpmf-data.json')
    : path.join(__dirname, '..', 'database', 'data.json')

let writeQueue = Promise.resolve()

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

async function ensureFile() {
  try {
    await fs.access(dataPath)
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true })
    await fs.writeFile(dataPath, `${JSON.stringify(seedData, null, 2)}\n`, 'utf8')
  }
}

async function read() {
  await writeQueue
  await ensureFile()
  return JSON.parse(await fs.readFile(dataPath, 'utf8'))
}

async function update(mutator) {
  let result
  writeQueue = writeQueue.then(async () => {
    await ensureFile()
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
    result = await mutator(data)
    const temporaryPath = `${dataPath}.${process.pid}.tmp`
    await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    await fs.rename(temporaryPath, dataPath)
  })
  await writeQueue
  return clone(result)
}

function nextId(collection) {
  return collection.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0) + 1
}

module.exports = { read, update, nextId, dataPath }
