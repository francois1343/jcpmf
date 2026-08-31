require('dotenv').config()

const bcrypt = require('bcryptjs')
const useJsonStore = (process.env.DATA_STORE || 'json').toLowerCase() !== 'mysql'

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((argument) => {
      const [key, ...parts] = argument.replace(/^--/, '').split('=')
      return [key, parts.join('=')]
    }),
  )
  const email = args.email?.trim().toLowerCase()
  const username = args.username?.trim()
  const password = args.password

  if (!email || !username || !password || password.length < 10) {
    throw new Error('Usage : npm run create-admin -- --email=admin@example.com --username=admin --password=10-caracteres-minimum')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  if (useJsonStore) {
    const store = require('../storage/json-store')
    await store.update((data) => {
      const now = new Date().toISOString()
      let user = data.users.find((item) => (
        item.email.toLowerCase() === email || item.username.toLowerCase() === username.toLowerCase()
      ))
      if (!user) {
        user = { id: store.nextId(data.users), createdAt: now }
        data.users.push(user)
      }
      Object.assign(user, { username, email, passwordHash, role: 'admin', updatedAt: now })
    })
  } else {
    const db = require('../config/db')
    await db.execute(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash), role = 'admin'`,
      [username, email, passwordHash],
    )
    await db.end()
  }
  console.log(`Compte administrateur prêt : ${email}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
